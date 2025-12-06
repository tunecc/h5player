// ==UserScript==
// @name         精简HTML5播放器增强脚本
// @name:en      Simple HTML5 Video Player Enhancer
// @namespace    https://github.com/tunecc/h5player
// @version      2.35
// @description  极简 HTML5 视频增强脚本，支持倍速、快进快退、智能全屏（保留控制栏）。
// @description:en Minimalist HTML5 video enhancer. Supports speed control, fast forward/rewind, and smart fullscreen (with controls).
// @author       Tune
// @homepage     https://github.com/tunecc/h5player
// @source       https://github.com/tunecc/h5player
// @downloadURL  https://raw.githubusercontent.com/tunecc/h5player/master/h5player.user.js
// @updateURL    https://raw.githubusercontent.com/tunecc/h5player/master/h5player.user.js
// @icon         https://raw.githubusercontent.com/tunecc/h5player/master/logo.png
// @match        *://*/*
// @grant        none
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- 配置区域 ---
    const STEP_XC = 0.1;
    const MAX_SPEED = 16.0;
    const MIN_SPEED = 0.1;
    const DEFAULT_RESTORE_SPEED = 1.5;
    const CLICK_THRESHOLD = 500; 
    const SEEK_STEP_FORWARD = 5; 
    const SEEK_STEP_REWIND = 3;  
    // ----------------

    const plusInfo = {}; 
    let lastPlaybackRate = DEFAULT_RESTORE_SPEED; 
    let seekAccumulator = 0; 
    let seekResetTimer = null;
    
    // 【核心变量】用于缓存当前正在活跃的视频元素
    let currentVideo = null;

    // UI配置
    const tipsDiv = document.createElement('div');
    tipsDiv.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        padding: 0px 2px;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        top: 0;
        left: 0;
        transition: opacity 0.3s ease;
        opacity: 0;
        border-bottom-right-radius: 4px;
        display: none;
        pointer-events: none;
        text-shadow: none;
    `;

    let timer = null;

    function showTips(text, targetVideo) {
        if (!targetVideo) return;

        const fullscreenEl = document.fullscreenElement || document.webkitFullscreenElement;
        const container = fullscreenEl || document.body;
        if (tipsDiv.parentNode !== container) {
            container.appendChild(tipsDiv);
        }

        const rect = targetVideo.getBoundingClientRect();
        const top = Math.max(0, rect.top); 
        const left = Math.max(0, rect.left);

        tipsDiv.style.top = `${top}px`;
        tipsDiv.style.left = `${left}px`;
        tipsDiv.innerText = text;
        tipsDiv.style.display = 'block';
        
        requestAnimationFrame(() => { tipsDiv.style.opacity = '1'; });
        
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            tipsDiv.style.opacity = '0';
            setTimeout(() => { tipsDiv.style.display = 'none'; }, 400);
        }, 800);
    }

    /**
     * 【核心升级】视频捕获器
     * 模仿原版 mediaCore 逻辑：监听 document 上的媒体事件
     * 只要有视频发出信号（播放、暂停、加载），立刻将其捕获
     */
    function captureMedia(e) {
        const target = e.target;
        // 只捕获 VIDEO 标签，且必须是有效的 DOM 元素
        if (target && target.tagName === 'VIDEO') {
            // 更新当前活跃的视频
            currentVideo = target;
        }
    }

    // 在捕获阶段监听事件 (useCapture = true)，确保能抓到 ShadowDOM 里的事件
    // 这些事件触发频率低，不会占用资源
    document.addEventListener('play', captureMedia, true);
    document.addEventListener('playing', captureMedia, true);
    document.addEventListener('pause', captureMedia, true);
    document.addEventListener('timeupdate', captureMedia, true); // timeupdate 保证了哪怕视频在播放中也能被持续锁定
    document.addEventListener('canplay', captureMedia, true);

    /**
     * 获取目标视频
     * 逻辑：
     * 1. 优先返回【事件捕获】到的、正在活跃的 currentVideo (最准、最快)
     * 2. 如果没有(比如视频暂停了很久)，再回退到 querySelector 查找 (兜底)
     */
    function getTargetPlayer() {
        // 1. 检查缓存的视频是否还存在于页面上
        if (currentVideo && currentVideo.isConnected) {
            return currentVideo;
        }

        // 2. 兜底查找：如果缓存失效，才去遍历 DOM
        // 删除了 querySelectorAll('*')，只查 video，性能大幅提升
        const medias = Array.from(document.querySelectorAll('video'));
        
        // 过滤可见视频
        const visibleMedias = medias.filter(m => {
            const rect = m.getBoundingClientRect();
            return rect.width > 10 && rect.height > 10;
        });

        if (visibleMedias.length > 0) {
            // 更新缓存
            currentVideo = visibleMedias[visibleMedias.length - 1];
            return currentVideo;
        }

        return null;
    }

    function setSpeed(rate) {
        const player = getTargetPlayer();
        if (!player) return false;

        rate = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Number(rate.toFixed(2))));
        player.playbackRate = rate;
        showTips(`${rate}x`, player);
        return true;
    }

    function toggleResetSpeed() {
        const player = getTargetPlayer();
        if (!player) return false;
        
        if (player.playbackRate === 1.0) {
            setSpeed(lastPlaybackRate);
        } else {
            lastPlaybackRate = player.playbackRate;
            setSpeed(1.0);
        }
        return true;
    }

    function changeSpeed(delta) {
        const player = getTargetPlayer();
        if (!player) return false;
        setSpeed(player.playbackRate + delta);
        return true;
    }

    function changeTime(seconds) {
        const player = getTargetPlayer();
        if (!player) return false;

        player.currentTime += seconds;
        seekAccumulator += seconds;

        if (seekResetTimer) clearTimeout(seekResetTimer);
        seekResetTimer = setTimeout(() => { seekAccumulator = 0; }, 1000);

        const text = seekAccumulator > 0 ? `+${seekAccumulator}s` : `${seekAccumulator}s`;
        showTips(text, player);
        return true;
    }

    function setPlaybackRatePlus(num, isRepeat) {
        const player = getTargetPlayer();
        if (!player) return false;

        num = Number(num);
        const now = Date.now();

        if (!plusInfo[num]) {
            plusInfo[num] = { time: 0, value: num };
        }

        if (isRepeat || (now - plusInfo[num].time < CLICK_THRESHOLD)) {
            plusInfo[num].value += num;
        } else {
            plusInfo[num].value = num;
        }

        plusInfo[num].time = now;
        setSpeed(plusInfo[num].value);
        return true;
    }

    function tccFullScreen(player) {
        const host = window.location.host;
        let selector = '';

        if (host.includes('bilibili.com')) selector = '.bpx-player-ctrl-full, .squirtle-video-fullscreen';
        else if (host.includes('youtube.com')) selector = '.ytp-fullscreen-button';
        else if (host.includes('iqiyi.com')) selector = '.iqp-btn-fullscreen';
        else if (host.includes('youku.com')) selector = '.control-fullscreen-icon';
        else if (host.includes('qq.com')) selector = 'txpdiv[data-report="window-fullscreen"]';

        if (selector) {
            const btn = document.querySelector(selector);
            if (btn) {
                btn.click();
                return true;
            }
        }
        return false;
    }

    function getContainer(player) {
        let container = player;
        let parent = player.parentNode;
        for (let i = 0; i < 3; i++) {
            if (!parent || parent.tagName === 'BODY') break;
            const pRect = parent.getBoundingClientRect();
            const vRect = player.getBoundingClientRect();
            if (pRect.width <= vRect.width * 1.5 && pRect.height <= vRect.height * 1.5) {
                container = parent;
            }
            parent = parent.parentNode;
        }
        return container;
    }

    function toggleFullScreen() {
        const player = getTargetPlayer();
        if (!player) return false; 

        if (tccFullScreen(player)) return true;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            const container = getContainer(player);
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (player.webkitEnterFullscreen) {
                player.webkitEnterFullscreen();
            }
        }
        return true;
    }

    function isInteractiveElement(element) {
        if (!element) return false;
        const tag = element.tagName ? element.tagName.toUpperCase() : '';
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return true;
        if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') return true;
        
        const className = (element.className || '').toString().toLowerCase();
        if (className.includes('bpx-player-dm-input') || className.includes('reply-box-textarea')) return true;
        
        return false;
    }

    document.addEventListener('keydown', (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        const realTarget = path.length > 0 ? path[0] : e.target;
        const activeEl = document.activeElement;

        if (isInteractiveElement(realTarget) || isInteractiveElement(activeEl)) {
            return;
        }
        
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        // 按键时，不再疯狂遍历 DOM，而是直接拿缓存的 currentVideo
        // 只有缓存失效时才会进行简单的 DOM 查询
        
        const key = e.key.toLowerCase();
        let handled = false;

        switch (key) {
            case '1': handled = setPlaybackRatePlus(1, e.repeat); break;
            case '2': handled = setPlaybackRatePlus(2, e.repeat); break;
            case '3': handled = setPlaybackRatePlus(3, e.repeat); break;
            case '4': handled = setPlaybackRatePlus(4, e.repeat); break;

            case 'z': handled = toggleResetSpeed(); break;
            case 'x': handled = changeSpeed(-STEP_XC); break;
            case 'c': handled = changeSpeed(STEP_XC);  break;

            case 'enter': handled = toggleFullScreen(); break;
            
            case 'arrowright': handled = changeTime(SEEK_STEP_FORWARD); break; 
            case 'arrowleft': handled = changeTime(-SEEK_STEP_REWIND); break; 

            default: handled = false;
        }

        if (handled) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

})();