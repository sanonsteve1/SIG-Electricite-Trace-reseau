import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {InputTextModule} from 'primeng/inputtext';
import {PasswordModule} from 'primeng/password';
import {RippleModule} from 'primeng/ripple';
import {AppConfigurator} from '@/layout/components/app.configurator';
import {InputGroup} from 'primeng/inputgroup';
import {InputGroupAddon} from 'primeng/inputgroupaddon';
import {Image} from "primeng/image";

@Component({
	selector: 'app-login-2',
	standalone: true,
	imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, AppConfigurator, InputGroup, InputGroupAddon, Image],
	templateUrl: './login.html'
})
export class Login {
	password: string = '';

	login: string = '';
}
