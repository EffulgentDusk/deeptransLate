'use strict';
const debug = true;
if (debug)
	console.info(`DeeptransLate background: ${new Date().toISOString()}`);
const ua = typeof browser === 'undefined'? chrome : browser;

const serviceURL = 'https://www.deepl.com/jsonrpc';
const translateSettings = {
	FROM_LANGUAGE_DEFAULT: '"EN"', // auto, DE, EN, FR, ES, IT, NL, PL
	TO_LANGUAGE_DEFAULT: '"DE"',
	FROM_LANGUAGE: '"auto"',
	TO_LANGUAGE: '"DE"'
};

const sendToTab = (trigger, data = null, onResponse = null) => {
	if (debug)
		console.info(`sendToTab: ${trigger}`, data);
	ua.tabs.query({active: true, currentWindow: true}, tabs => {
		ua.tabs.sendMessage(tabs[0].id, {trigger: trigger, data: data}, onResponse);
	});
};

const serviceResponse = ev => {
	if (debug)
		console.info(`Service response: ${ev.target.response}`);
	try {
		let resp = JSON.parse(ev.target.response);
		sendToTab('translated', resp);
	} catch(e) {
		sendToTab('translated', 'WARNING:No valid JSON response');
	}
};

const getSelection = msg => {
	if (debug)
		console.info(`getSelection: "${msg.selection}"`);
	const tSettings = Object.assign({
		TEXT_TO_TRANSLATE: `"${msg.selection.replace(/\"/g, '\\"')}"`,
		ID: msg.id
	}, translateSettings);
	const xhr = new XMLHttpRequest();
	xhr.open('POST', serviceURL);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.addEventListener('load', serviceResponse);
	xhr.addEventListener('error', ev => sendToTab('translated', {warn: ev}));
	fetch('deepLRequest')
		.then(resp => resp.text())
		.then(json => {
			for (let placeholder in tSettings) {
				let re = new RegExp('\\b' + placeholder + '\\b', 'g');
				json = json.replace(re, tSettings[placeholder]);
			}
			xhr.send(json);
		})
	;
};

ua.browserAction.onClicked.addListener(ev => sendToTab('buttonClicked', null, getSelection));

ua.contextMenus.create({
	id: 'deeptransLate',
	title: 'Translate with DeepL',
	contexts: ['all'],
	onclick: (info, tab) => sendToTab('menuClicked', null, getSelection)
});
