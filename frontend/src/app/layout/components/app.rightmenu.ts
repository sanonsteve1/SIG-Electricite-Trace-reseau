import {Component, inject} from '@angular/core';
import {LayoutService} from '@/layout/service/layout.service';
import {FormsModule} from '@angular/forms';
import {DrawerModule} from 'primeng/drawer';

@Component({
    selector: '[app-right-menu]',
    standalone: true,
    imports: [DrawerModule, FormsModule],
    template: `<p-drawer [(visible)]="rightMenuActive" position="right">
        <ng-template #headless>
            <div class="p-7">
                <div class="flex flex-col mb-8">
                    <span class="pb-2 mb-2 border-b border-surface font-semibold">ONLINE MEMBERS</span>
                    <div class="flex flex-row flex-wrap gap-1">
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-1.png" alt="avatar-1" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-2.png" alt="avatar-2" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-3.png" alt="avatar-3" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-4.png" alt="avatar-4" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-5.png" alt="avatar-5" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-6.png" alt="avatar-6" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-7.png" alt="avatar-7" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-8.png" alt="avatar-8" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-9.png" alt="avatar-9" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-10.png" alt="avatar-10" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-11.png" alt="avatar-11" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-12.png" alt="avatar-12" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-13.png" alt="avatar-13" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-14.png" alt="avatar-14" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-15.png" alt="avatar-15" />
                        <img class="cursor-pointer" style="width: 32px" src="/layout/images/avatar/avatar-16.png" alt="avatar-16" />
                    </div>
                    <span class="mt-4"><b class="text-primary">+19</b> Costumers</span>
                </div>
                <div class="flex flex-col mb-8">
                    <span class="pb-2 mb-2 border-b border-surface font-semibold">LATEST ACTIVITY</span>
                    <div class="flex pt-2">
                        <i class="pi pi-images self-start p-2 border border-transparent rounded-full mr-2" style="background-color: rgba(0, 0, 0, 0.12)"></i>
                        <div class="flex flex-col">
                            <span class="font-bold mb-1">New Sale</span>
                            <span class="mb-2 leading-normal">Richard Jones has purchased a blue t-shirt for $79.</span>
                            <span class="flex items-center">
                                <img class="mr-2" src="/layout/images/avatar/activity-1.png" alt="" />
                                <small>Emmy Adams, 21.40</small>
                            </span>
                        </div>
                    </div>
                    <div class="flex pt-4">
                        <i class="pi pi-images self-start p-2 border border-transparent rounded-full mr-2" style="background-color: rgba(0, 0, 0, 0.12)"></i>
                        <div class="flex flex-col">
                            <span class="font-bold mb-1">Withdrawal Initiated</span>
                            <span class="mb-2 leading-normal">Your request for withdrawal of $2500 has been initiated.</span>
                            <span class="flex items-center">
                                <img class="mr-2" src="/layout/images/avatar/activity-2.png" alt="avatar-2" />
                                <small>Emily Walter, 21.40</small>
                            </span>
                        </div>
                    </div>
                    <div class="flex pt-4">
                        <i class="pi pi-images self-start p-2 border border-transparent rounded-full mr-2" style="background-color: rgba(0, 0, 0, 0.12)"></i>
                        <div class="flex flex-col">
                            <span class="font-bold mb-1">Question Received</span>
                            <span class="mb-2 leading-normal">Jane Davis has posted a new question about your product.</span>
                            <span class="flex items-center">
                                <img class="mr-2" src="/layout/images/avatar/activity-3.png" alt="avatar-3" />
                                <small>Jane Davis, 21.45</small>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col">
                    <span class="pb-2 mb-2 border-b border-surface font-semibold">NEXT EVENTS</span>
                    <ul class="m-0 list-none p-0">
                        <li class="py-4 px-2 rounded-md hover:bg-emphasis cursor-pointer"><i class="pi pi-eye mr-4"></i>A/B Test</li>
                        <li class="py-4 px-2 rounded-md hover:bg-emphasis cursor-pointer"><i class="pi pi-video mr-4"></i>Video Shoot</li>
                        <li class="py-4 px-2 rounded-md hover:bg-emphasis cursor-pointer"><i class="pi pi-sitemap mr-4"></i>Board Meeting</li>
                        <li class="py-4 px-2 rounded-md hover:bg-emphasis cursor-pointer"><i class="pi pi-compass mr-4"></i>Q4 Planning</li>
                        <li class="py-4 px-2 rounded-md hover:bg-emphasis cursor-pointer"><i class="pi pi-palette mr-4"></i>Design Training</li>
                    </ul>
                </div>
            </div>
        </ng-template>
    </p-drawer>`
})
export class AppRightMenu {
    layoutService = inject(LayoutService);

    get rightMenuActive(): boolean {
        return this.layoutService.layoutState().rightMenuActive;
    }

    set rightMenuActive(_val: boolean) {
        this.layoutService.layoutState.update((prev) => ({ ...prev, rightMenuActive: _val }));
    }
}
