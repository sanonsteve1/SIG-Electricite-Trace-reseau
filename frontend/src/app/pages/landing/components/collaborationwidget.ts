import { Component } from '@angular/core';

@Component({
    selector: 'collaboration-widget',
    standalone: true,
    template: `<div id="collaboration" style="max-width: 1200px" class="flex flex-col lg:flex-row gap-20 mt-12 py-12 px-6 w-full">
        <div class="flex flex-col items-end justify-center">
            <div class="bg-surface-50 dark:bg-surface-800 text-white text-sm p-2 rounded-lg mb-6">PLAY AS A TEAM</div>
            <div>
                <h1 class="m-0 text-6xl font-bold text-right" style="background: linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent">COLLABORATION</h1>
                <p class="text-white text-right mt-4">
                    The Earth is a very small stage in a vast cosmic arena. Think of the rivers of blood spilled by all those generals and emperors so that, in glory and triumph, they could become the momentary masters of a fraction of a dot.
                </p>
            </div>
        </div>
        <img [attr.draggable]="false" src="/images/landing/collaboration-image.png" alt="collaboration" />
    </div>`
})
export class CollaborationWidget {}
