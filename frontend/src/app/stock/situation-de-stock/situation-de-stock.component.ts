import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../services/auth.service";

@Component({
	selector: 'app-empty',
	standalone: true,
	imports: [],
	providers: [AuthService],
	templateUrl: './situation-de-stock.component.html'
})
export class SituationDeStock implements OnInit {
	constructor() {
	}

	ngOnInit(): void {
	}
}
