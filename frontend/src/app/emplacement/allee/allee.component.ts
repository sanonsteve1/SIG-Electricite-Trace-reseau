import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../services/auth.service";

@Component({
	selector: 'app-empty',
	standalone: true,
	imports: [],
	providers: [AuthService],
	templateUrl: './allee.component.html'
})
export class Allee implements OnInit {
	constructor() {
	}

	ngOnInit(): void {
	}
}
