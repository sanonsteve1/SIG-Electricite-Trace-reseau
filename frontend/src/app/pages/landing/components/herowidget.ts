import { Component } from '@angular/core';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'hero-widget',
    standalone: true,
    imports: [ButtonModule, RippleModule],
    template: `<div class="hidden lg:block absolute top-0 right-0 bottom-0 left-0 parallax__layer__0">
            <img [attr.draggable]="false" src="/images/landing/layer-0-opt.jpg" class="w-full h-full block absolute bottom-0" />
        </div>
        <div class="hidden lg:block absolute top-0 right-0 bottom-0 left-0 parallax__layer__1">
            <img [attr.draggable]="false" src="/images/landing/layer-1-opt.png" class="w-full block absolute bottom-0" />
        </div>

        <div class="hidden lg:flex absolute right-0 bottom-0 left-0 parallax__layer__3 justify-center" style="top: 27%">
            <div>
                <h1 class="m-0 -mb-6 text-4xl text-white">LET'S</h1>
                <h1 class="m-0 text-white" style="font-size: 15rem">EXPLORE</h1>
                <div class="flex -mt-6 justify-end">
                    <h1 class="m-0 text-white text-4xl">TO ULTIMA</h1>
                </div>
            </div>
        </div>
        <div class="hidden lg:block absolute top-0 right-0 bottom-0 left-0 parallax__layer__2">
            <img [attr.draggable]="false" src="/images/landing/layer-2-opt.png" class="w-full block absolute bottom-0" />
        </div>

        <div class="absolute flex justify-center items-center w-full h-full parallax__layer__3" style="top: 112px">
            <button
                pButton
                pRipple
                label="GET STARTED"
                (click)="handleScroll('features')"
                style="backdrop-filter: blur(7px)"
                class="!text-surface-0 !bg-white/20 !text-lg !px-8 !py-4 !font-semibold hover:!bg-white hover:!text-surface-900 !rounded-xl !border-white/30 border"
                text
            ></button>
        </div>

        <div class="block lg:hidden h-[28rem] bg-center bg-no-repeat bg-cover" style="top: 68px; background: url(/images/landing/landing-hero-image.jpg)">
            <div class="flex justify-center items-center h-full">
                <div class="flex flex-col">
                    <span class="m-0 text-base text-white font-semibold">LET'S</span>
                    <span class="m-0 text-4xl text-white font-semibold">EXPLORE</span>
                    <div class="flex justify-end">
                        <span class="m-0 text-white text-sm font-semibold">TO ULTIMA</span>
                    </div>
                    <div class="flex justify-center mt-2">
                        <button
                            pButton
                            pRipple
                            label="GET STARTED"
                            (click)="handleScroll('parallaxBody')"
                            style="backdrop-filter: blur(7px)"
                            class="!text-surface-0 !bg-white/20 !text-xs !font-semibold hover:!bg-white hover:!text-surface-900 !rounded-xl !border-white/30 border"
                            text
                        ></button>
                    </div>
                </div>
            </div>
        </div>`,
    host: {
        style: 'display: contents;'
    }
})
export class HeroWidget {
    handleScroll(id: string) {
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: 'smooth' });
    }
}
