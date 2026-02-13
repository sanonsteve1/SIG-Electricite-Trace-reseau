import {Component, inject} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {LayoutService} from "@/layout/service/layout.service";
import {SHA1, VERSION} from "../../../../environments/version";
import {NgClass} from "@angular/common";
import {Image} from "primeng/image";

@Component({
	standalone: true,
	selector: '[app-footer]',
	imports: [ButtonModule, NgClass, Image],
	template: `
		<div class="flex justify-start">
			<span class="font-medium text-lg text-muted-color">
				<p-image src="/images/logo/logo-abstock.png" width="40"/>
			</span>
			<span class="titre-logo" [ngClass]="{'text-white': layoutService.isDarkTheme(), 'text-blue-700': !layoutService.isDarkTheme()}"><b>ABstock</b></span>
		</div>
		<div class="flex gap-0 items-center">
			<button pButton icon="fa fa-code-fork" rounded text severity="secondary"></button>
			<span>{{ VERSION }} - {{ SHA1 }}</span>
		</div>`,
	host: {
		class: 'layout-footer'
	},
	styles: `
		.titre-logo {
			font-family: "Arial", serif;
			font-weight: normal;
			font-size: 20px;
		}
	`
})
export class AppFooter {
	layoutService = inject(LayoutService);
	protected readonly VERSION = VERSION;
	protected readonly SHA1 = SHA1;
}
