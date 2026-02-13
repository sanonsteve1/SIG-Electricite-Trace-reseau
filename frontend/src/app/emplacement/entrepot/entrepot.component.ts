import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../services/auth.service";

@Component({
	selector: 'app-empty',
	standalone: true,
	imports: [],
	providers: [AuthService],
	templateUrl: './entrepot.component.html'
})
export class Entrepot implements OnInit {
	constructor() {
	}

	ngOnInit(): void {
	}
}
