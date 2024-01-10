const debug = true;

const CR = chrome.runtime;


console.log('START CONTENT ON '+window.location.href, window.location)

const ddePageInfo = (() => {
	const doc = document.documentElement;
	let attr = null;
	if(doc.hasAttribute('dde'))
		attr = doc.getAttribute('dde');
	else if(doc.hasAttribute('data-dde'))
		attr = doc.getAttribute('data-dde');
  if(attr) {
	attr = attr.split(' ')
	const mode = attr[0]
	const version = attr[1]
	if(!['strict', 'respectuous', 'broken'].includes(mode)) {
		console.error('unknown dde mode ', mode)
		status = 'unknown'
	}
	else if(['0.1'].includes(version))
		status = 'enabled'
	else
		status = 'unknown'
	
	let reason = false;
	if(doc.hasAttribute('reason'))
		reason = doc.getAttribute('reason');
	else if(doc.hasAttribute('data-reason'))
		reason = doc.getAttribute('data-reason');

	
	if(status == 'enabled') {
		const updateDeclaration = mode + ' ' + version + ' native';
		if(doc.hasAttribute('dde'))
			doc.setAttribute('dde', updateDeclaration);
		else if(doc.hasAttribute('data-dde'))
			doc.setAttribute('data-dde', updateDeclaration);
	}
	
	return {mode, reason, version, status}
  }
  else
	return false;
})();

if(ddePageInfo && ddePageInfo.status == 'enabled') {

	CR.sendMessage({ action: 'loadImplementation', version: ddePageInfo.version }, (response) => {
		// Réponse facultative du script de fond
		if(debug)
			console.log('loadImplementation', ddePageInfo.version, response);
		for(s of response.styles) {
			console.log(s)
		}
	});

	var stopFirstDOMContentLoaded = true;
	window.addEventListener("DOMContentLoaded", (event) => {
		if(stopFirstDOMContentLoaded) {
			event.stopImmediatePropagation();
			stopFirstDOMContentLoaded = false;
			if(debug)
				console.log("DOMContentLoaded 1* stopped propagation");
		}
		else
			if(debug)
				console.log("DOMContentLoaded 2* restore propagation");
	},true);
	



}


const updateJSState = (state) => {
	const url = window.location.origin + '/*';
	CR.sendMessage({action : 'updateJSState', JSState : state, url}, (resp) => {
console.log('RESP', resp)
		if(resp.reload)
			window.location.reload();
	});
}



CR.sendMessage({action : 'getJSState'}, (response) => {
	console.log(response)
	if(!response.JSState) {
		if(ddePageInfo.status === 'unknown') {
			alert("L'implémentation DDE demandée par cette page est inconnue. Votre extension est-t-elle à jour ?")
		}
		if(ddePageInfo.mode === 'broken') {
			const reason = ddePageInfo.reason || "Raison Inconnue"
			//alert('Cette page ne fonctionnera hélas pas correctement sans Javascript. Motif : ' + reason)
			if(!response.JSConfig) {
				dialog('Javascript est requis sur cette page.<br /> Motif : ' + reason+'<br /> Autoriser Javascript sur '+window.location.origin+' ?', {
					'Jamais' : () => {updateJSState('never')},
					'Toujours' : () => {updateJSState('always')},
					'Une fois' : () => {updateJSState('once')}
				})
			}
		}
	}
})



/* Update Popup */
CR.onMessage.addListener(function(request, sender, sendResponse) {
	console.log(request, sender, sendResponse);
	if(request.action === 'getDDEPageInfo') {
		sendResponse(ddePageInfo)
	}
});
