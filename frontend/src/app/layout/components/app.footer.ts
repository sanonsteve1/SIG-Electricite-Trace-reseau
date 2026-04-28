import {Component, inject} from '@angular/core';
import {LayoutService} from "@/layout/service/layout.service";
import {NgClass} from "@angular/common";
import {Image} from "primeng/image";

@Component({
	standalone: true,
	selector: '[app-footer]',
	imports: [NgClass, Image],
	template: `
		<div class="flex justify-start">
			<span class="font-medium text-lg text-muted-color footer-logo-wrap">
				<p-image src="/assets/logo-abun.png" width="52"/>
			</span>
			<span class="titre-logo" [ngClass]="{'text-white': layoutService.isDarkTheme(), 'text-blue-700': !layoutService.isDarkTheme()}"><b>AB-UN</b></span>
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

		.footer-logo-wrap {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: #ffffff;
			border-radius: 999px;
			padding: 3px;
			box-shadow: 0 1px 4px rgba(15, 23, 42, 0.2);
			margin-right: 6px;
		}
	`
})
export class AppFooter {
	layoutService = inject(LayoutService);
}
