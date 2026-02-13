import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {ApplicationErreur} from "../models/application-erreur.model";

@Injectable({
	providedIn: 'root'
})
export class ApplicationMessageService {

	message = new BehaviorSubject(null as ApplicationErreur);

	messageErreur = this.message.asObservable();

	updateMessageErreur(applicationErreur: ApplicationErreur) {
		this.message.next(applicationErreur);
	}

	clear() {
		this.message.next(null);
	}
}
