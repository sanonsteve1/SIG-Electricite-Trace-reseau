import { Component } from '@angular/core';

@Component({
    selector: 'easy-follow-widget',
    standalone: true,
    template: `<div id="events" style="max-width: 1200px" class="flex flex-col lg:flex-row gap-20 mt-12 py-12 px-6 w-full">
        <img [draggable]="false" src="/images/landing/easyfollow-image.png" alt="easyfollow" />
        <div class="flex flex-col items-start justify-center">
            <div class="bg-surface-50 dark:bg-surface-800 text-white text-sm p-2 rounded-lg mb-6">EVENTS</div>
            <div>
                <h1 class="m-0 text-6xl font-bold" style="background: linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent">EASY FOLLOW</h1>
                <p class="text-white mt-2">It has been said that astronomy is a humbling and character-building experience. There is perhaps no better demonstration of the folly of human conceits than this distant image of our tiny world.</p>
            </div>
        </div>
    </div>`
})
export class EasyFollowWidget {}
