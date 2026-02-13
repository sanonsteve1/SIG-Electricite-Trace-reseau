import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../services/auth.service";

@Component({
	selector: 'app-empty',
	standalone: true,
	imports: [],
	providers: [AuthService],
	templateUrl: './tableau-de-bord.component.html'
})
export class TableauDeBord implements OnInit {
	constructor() {
	}

	ngOnInit(): void {
	}
}
