import { Component } from '@angular/core';

@Component({
    selector: 'show-reels-widget',
    standalone: true,
    template: `<div id="video" style="max-width: 1200px" class="flex gap-6 mt-12 py-12 flex-col items-center w-full">
        <div class="bg-surface-50 dark:bg-surface-800 text-white text-sm p-2 rounded-lg">VIDEO</div>
        <h1 class="m-0 text-6xl font-bold" style="background: linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent">SHOWREELS</h1>
        <div class="mt-4 relative">
            <iframe class="border-0 rounded-lg z-30 max-w-full" width="600" height="400" src="https://www.youtube.com/embed/tgbNymZ7vqY"> </iframe>
            <div class="absolute z-0" style="top: -50px; left: -50px"><img [attr.draggable]="false" class="opacity-40" src="/images/landing/landing-ellipse.png" alt="" /></div>
            <div class="absolute z-0" style="bottom: -50px; right: -50px; filter: blur(4px)"><img [attr.draggable]="false" class="opacity-40" src="/images/landing/landing-ellipse2.png" alt="" /></div>
            <div class="absolute z-0" style="bottom: -50px; right: 10px; filter: blur(4px)"><img [attr.draggable]="false" class="opacity-40" src="/images/landing/landing-ellipse2.png" alt="" /></div>
        </div>
    </div>`
})
export class ShowReelsWidget {}
