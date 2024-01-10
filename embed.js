const ddeJS = (function() {
	
	const debug = true;
	
	const implementations = {
		'0.1' : [
			"lib/aria/ariaResolver.js",
			"lib/aria/click.js",
			"lib/aria/actionnable.js",
			"lib/aria/toggableStates.js",
			"lib/aria/simpleNavigation.js",
			"lib/aria/nestedNavigation.js",
			"lib/aria/main.js",
			"lib/zonesStates/zonesStates.js",
		],
	}
	
	var ddeVersion = document.documentElement.getAttribute('dde');
	if(ddeVersion.indexOf('native') !== -1) {
		console.log('DDE version already  natively supported. Aborted.');
		return;
	}
	ddeVersion = ddeVersion.split(' ');
	ddeVersion = {
		mode : ddeVersion[0],
		number : ddeVersion[1]
	};
	const libs = implementations[ddeVersion.number];
	
	function currentDirectory() {
		// Obtenez tous les scripts sur la page
		var scripts = document.getElementsByTagName('script');

		// Obtenez le dernier script chargé (supposant que c'est le script actuel)
		var currentScript = scripts[scripts.length - 1];

		// Obtenez l'URL du dossier du script
		var scriptUrl = currentScript.src;
		var scriptFolderUrl = scriptUrl.substring(0, scriptUrl.lastIndexOf('/'));
		return scriptFolderUrl+'/';
	}
	
	if(libs) {
		const root = currentDirectory();
		var scriptCounter = 0;
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
		for(l of libs) {
			let s = document.createElement('script');
			s.src = root+l
			s.onload = function() {
				scriptCounter++;
				if(!debug)
					this.remove();
				else {
					console.log('[DDE] ' + scriptCounter + ' / ' + libs.length + ' => ' + s.src +' loaded.')
				}
				if(libs.length === scriptCounter) {
					window.dispatchEvent(new Event("DOMContentLoaded", {"bubbles": true}));
				}
			};
		(document.head || document.documentElement).prepend(s);
		}
	}
	else
		console.error('requested DDE version not supported by this script. Aborted.');

	return ddeVersion
    
})();
