import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'features-widget',
    imports: [CommonModule],
    template: `<div id="features" class="pt-8" style="background-color: #000">
        <div class="flex flex-col items-center gap-4">
            <div class="bg-surface-50 dark:bg-surface-800 text-white text-sm p-2 rounded-lg mb-6">FEATURES</div>
            <span class="text-white text-2xl uppercase">All you need is the Ultima.</span>
            <h1 class="m-0 text-6xl" style="background: linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); background-clip: text; -webkit-background-clip: text; color: transparent">ULTIMA</h1>
        </div>
        <div class="flex flex-col items-center">
            <div class="grid grid-cols-12 gap-4 pt-12 p-6" style="max-width: 1200px">
                <div class="col-span-6 lg:col-span-4">
                    <div (mouseenter)="handleMouseEnter($event)" (mouseleave)="handleMouseLeave($event)" class="flex justify-center flex-col gap-4 border border-surface-50 dark:border-surface-800 rounded-2xl p-8 cursor-pointer h-full">
                        <i class="pi pi-palette !text-4xl text-white"></i>
                        <span class="font-semibold text-white">Creative Design</span>
                        <span class="text-white">Unleash your brand's full potential with our creative design services.</span>
                        <span class="text-primary-300 font-medium flex items-center">Learn more <i class="pi pi-arrow-right ml-2"></i></span>
                    </div>
                </div>
                <div class="col-span-6 lg:col-span-4">
                    <div (mouseenter)="handleMouseEnter($event)" (mouseleave)="handleMouseLeave($event)" class="flex justify-center flex-col gap-4 border border-surface-50 dark:border-surface-800 rounded-2xl p-8 cursor-pointer h-full">
                        <i class="pi pi-mobile !text-4xl text-white"></i>
                        <span class="font-semibold text-white">Responsive Design</span>
                        <span class="text-white">Make sure your website looks great and functions seamlessly on any device with responsive design.</span>
                        <span class="text-primary-300 font-medium flex items-center">Learn more <i class="pi pi-arrow-right ml-2"></i></span>
                    </div>
                </div>
                <div class="col-span-6 lg:col-span-4">
                    <div (mouseenter)="handleMouseEnter($event)" (mouseleave)="handleMouseLeave($event)" class="flex justify-center flex-col gap-4 border border-surface-50 dark:border-surface-800 rounded-2xl p-8 cursor-pointer h-full">
                        <i class="pi pi-sync !text-4xl text-white"></i>
                        <span class="font-semibold text-white">Cross Browser Support</span>
                        <span class="text-white">Don't let browser compatibility hold you back. Our cross browser support ensures your website works perfectly on all browsers.</span>
                        <span class="text-primary-300 font-medium flex items-center">Learn more <i class="pi pi-arrow-right ml-2"></i></span>
                    </div>
                </div>
                <div class="col-span-6 lg:col-span-4">
                    <div (mouseenter)="handleMouseEnter($event)" (mouseleave)="handleMouseLeave($event)" class="flex justify-center flex-col gap-4 border border-surface-50 dark:border-surface-800 rounded-2xl p-8 cursor-pointer h-full">
                        <i class="pi pi-th-large !text-4xl text-white"></i>
                        <span class="font-semibold text-white">Well Organized</span>
                        <span class="text-white">Our well-organized approach guarantees a smooth design process from start to finish.</span>
                        <span class="text-primary-300 font-medium flex items-center">Learn more <i class="pi pi-arrow-right ml-2"></i></span>
                    </div>
                </div>
                <div class="col-span-6 lg:col-span-4">
                    <div (mouseenter)="handleMouseEnter($event)" (mouseleave)="handleMouseLeave($event)" class="flex justify-center flex-col gap-4 border border-surface-50 dark:border-surface-800 rounded-2xl text-white p-8 cursor-pointer h-full">
                        <i class="pi pi-code !text-4xl text-white"></i>
                        <span class="font-semibold text-white">Easy to Product</span>
                        <span class="text-white">We make product creation easy with straightforward and intuitive processes.</span>
                        <span class="text-primary-300 font-medium flex items-center">Learn more <i class="pi pi-arrow-right ml-2"></i></span>
                    </div>
                </div>
                <div class="col-span-6 lg:col-span-4">
                    <div (mouseenter)="handleMouseEnter($event)" (mouseleave)="handleMouseLeave($event)" class="flex justify-center flex-col gap-4 border border-surface-50 dark:border-surface-800 rounded-2xl text-white p-8 cursor-pointer h-full">
                        <i class="pi pi-box !text-4xl"></i>
                        <span class="font-semibold">Top Notch Quality</span>
                        <span>Expect top notch quality in all of our work, delivering exceptional results every time.</span>
                        <span class="text-primary-300 font-medium flex items-center">Learn more <i class="pi pi-arrow-right ml-2"></i></span>
                    </div>
                </div>
            </div>

            <ng-content />
        </div>
    </div>`
})
export class FeaturesWidget {
    handleMouseEnter(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (target) {
            target.style.background = 'linear-gradient(110.43deg, rgba(134,140,208,.5) 0.04%, rgba(255,87,89,.5) 100.11%)';
        }
    }

    handleMouseLeave(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (target) {
            target.style.background = 'unset';
        }
    }
}
