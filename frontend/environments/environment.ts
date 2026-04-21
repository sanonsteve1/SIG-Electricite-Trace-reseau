export const environment = {
	production: false,
	apiUrl: 'http://localhost:8075',
	url: 'http://localhost:4300',
	/** API GIS (script_bd FastAPI) - tableau de bord */
	gisApiUrl: 'http://localhost:8000',
	/** API OCR locale (dossier D:/SONABEL REPRISE ACTIVITE/API OCR) */
	ocrApiUrl: 'http://localhost:8001',
	/**
	 * URL du chatbot (page ou iframe). Si renseignée, ouverture dans un nouvel onglet avec ?ouvrage=&label=.
	 * Sinon le contexte est seulement stocké dans sessionStorage (clé abun_chatbot_ouvrage_context).
	 */
	chatbotUrl: ''
};
