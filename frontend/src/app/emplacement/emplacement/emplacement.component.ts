import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../services/auth.service";

@Component({
	selector: 'app-empty',
	standalone: true,
	imports: [],
	providers: [AuthService],
	templateUrl: './emplacement.component.html'
})
export class Emplacement implements OnInit {
	constructor() {
	}

	ngOnInit(): void {
	}
}
