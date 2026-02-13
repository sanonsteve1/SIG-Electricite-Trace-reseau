import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../services/auth.service";

@Component({
	selector: 'app-empty',
	standalone: true,
	imports: [],
	providers: [AuthService],
	templateUrl: './quai.component.html'
})
export class Quai implements OnInit {
	constructor() {
	}

	ngOnInit(): void {
	}
}
