const zonesStates = (function() {
	
	const debug = true;

	var sameContextSources = [location.origin]
	var cachedLayouts = {}
	var cachedZonesStates = {}
	
	const saveState = (url, state, updateCurrent) => {
		if(updateCurrent)
			history.replaceState(state, '', url)
		else
			history.pushState(state, '', url)
	}
	
	const currentURL = () => {
		return location.hash.length ? location.href.slice(0, -1 * location.hash.length) : location.href;
	}
	
	const currentLayoutKey = (url, dom) => {
		if(!url)
			url = currentURL()
		if(!dom)
			dom = document;
		return dom.body.hasAttribute('d-layout') ? dom.body.getAttribute('d-layout') : false
	}
	
	const cacheZoneState = (z) => {
		let zKey = z.getAttribute('d-zone')
		if(!cachedZonesStates[z.id])
			cachedZonesStates[z.id] = {}
		if(!cachedZonesStates[z.id][zKey])
			cachedZonesStates[z.id][zKey] = z;
		return cachedZonesStates[z.id][zKey];
	}
	
	const currentState = () => {
		const layoutKey = currentLayoutKey()
		var zonesStatesKeys = {}, bodyAttributes = {}
		
		if(!cachedLayouts[layoutKey])	// ensure cache storing
			cachedLayouts[layoutKey] = document.body
		
		for(z of document.querySelectorAll('[id][d-zone]')) {
			let zKey = z.getAttribute('d-zone')
			zonesStatesKeys[z.id] = zKey
			cacheZoneState(z);	// ensure cache storing
		}
		
		bodyAttributes = {};
		
		for(attr of document.body.attributes)
			bodyAttributes[attr.name] = attr.value;
		
		return {layoutKey, bodyAttributes, zonesStatesKeys};
	}
	
	const getAlreadyStoredKeys = () => {	// will be used by requests to say to the server what dynamical elements are already loaded by UA
		var storedZonesStatesKeys = {}
		for(zId in cachedZonesStates)
			storedZonesStatesKeys[zId] = Object.keys(cachedZonesStates[zId])
		return {
			layouts : Object.keys(cachedLayouts),
			zones : storedZonesStatesKeys
		}
	}
	
	const updateHead = (iHead) => {
		const head = document.head;
		const sel = {
			firstOnly : 'base, title, meta[charset]',
			update : 'meta[http-equiv], meta[name], meta[itemprop]',
			addIfNoPresents : 'link, script, style'
		}
		
		var newElements = []
		
		for(s of sel.firstOnly.split(',')) {
			s = s.trim()
			let oldEl = head.querySelector(s)
			let newEl = iHead.querySelector(s)
			if(oldEl) {
				oldEl.after(newEl);	// inject
				oldEl.parentNode.removeChild(oldEl);	// remove
			} else {
				head.prepend(newEl)
			}
		}
		let idAttrs = ['http-equiv', 'name', 'itemprop']
		for(meta of iHead.querySelectorAll(sel.update)) {
			let id = null
			for(idAttr of idAttrs) {
				if(meta.hasAttribute(idAttr)) {
					id = meta.getAttribute(idAttr)
					break;
				}
				let oldMeta = head.querySelector('meta['+idAttr+'='+id+']')
				if(oldMeta) {
					oldMeta.after(meta);	// inject
					oldMeta.parentNode.removeChild(oldMeta);	// remove
				} else
					newElements.push(meta)
			}
		}
		idAttrs = ['id', 'href', 'src']
		for(ressource of iHead.querySelectorAll(sel.addIfNoPresents)) {
			let id = null, tName = ressource.tagName.toLowerCase()
			for(idAttr of idAttrs) {
				if(ressource.hasAttribute(idAttr)) {
					id = ressource.getAttribute(idAttr)
					break;
				}
				if(id)
					oldRessource = head.querySelector(tName+'['+idAttr+'='+id+']')
				if(!id || !oldRessource)
					newElements.push(ressource)
			}
		}
		
		for(newEl of newElements) {
			if(newEl.parentNode.tagName === 'NOSCRIPT') {
				let noscript = document.createElement('noscript')
				noscript.append(newEl)
				head.append(noscript)
			} else {
				head.append(newEl)
			}
		}
	}
	
	const loadContent = (url, content, updateState) => {
		const incomingDOM = new DOMParser().parseFromString(content, 'text/html');
		let layoutKey = currentLayoutKey(url, incomingDOM)
		const incomingHead = incomingDOM.head
		
		let cBase = document.head.querySelector('base')
		let iBase = incomingHead.querySelector('base')
		
		if( (cBase && !iBase) || (!cBase && iBase) || (cBase && iBase && cBase.href !== iBase.href) )
			return window.location.href = url;
		
		if(!layoutKey) {
			//layoutKey = url
			return window.location.href = url;
		}
		
		updateHead(incomingHead)
		
		var incomingZones = {}, incomingLayout = null, incomingBodyAttributes = {};
		
		for(attr of incomingDOM.body.attributes)
			incomingBodyAttributes[attr.name] = attr.value;
		
		for(z of incomingDOM.querySelectorAll('[id][d-zone]')) {
			incomingZones[z.id] = cacheZoneState(z)
		}
		
		if(!cachedLayouts[layoutKey])
			incomingLayout = cachedLayouts[layoutKey] = incomingDOM.body
		else
			incomingLayout = cachedLayouts[layoutKey]
		
		document.body.setAttribute('aria-live', 'assertive');
		
		for(zId in incomingZones) {
			zToReplace = document.getElementById(zId)
			if(!zToReplace) {
				if(debug)
					return console.error('Layout Integrity Error')
				else
					return window.location.href = url	// un problème ? => navigation classique
			}
			if(zToReplace != incomingZones[zId]) {
				zToReplace.after(incomingZones[zId]);	// inject
				zToReplace.parentNode.removeChild(zToReplace);	// remove
				
			}
		}

		// Annoncez que les changements sur le body sont terminés
		document.body.removeAttribute('aria-live');
		
		if(document.body != incomingLayout)
			document.body.replaceWith(incomingLayout);	// update, si tout s'est bien passé
		
		while (document.body.attributes.length > 0) {
			document.body.removeAttribute(document.body.attributes[0].name);
		}
		
		for(attr in incomingBodyAttributes)
			document.body.setAttribute(attr, incomingBodyAttributes[attr]);
		
		saveState(url, currentState(), updateState)
		
		if(url.indexOf('#')) {
			anchor(url)
		}
	}

	const process = (url, opt = {}) => {
		opt = {
			method : opt.method?.toLowerCase() || 'get',
			datas : opt.datas || null,
			updateState : opt.updateState || false,
			success : opt.success || function(content) {
				if(content !== false)
					loadContent(url, content, opt.updateState)
				else
					console.error('ABORTED '+ url)
			},
			error : opt.error || function(response) {
				if(opt.method === 'get') {
					if(confirm(`Oups! ${response.status}. Afficher la page d'erreur ?`))
						return response.text()
				} else
					alert(`Oups! ${error}.`);
				return false;
			},
		}
		const csrf = document.head.querySelector('meta[name="csrf-token"]')
console.log(getAlreadyStoredKeys())
		var headers = {
			'D-Ignored': JSON.stringify(getAlreadyStoredKeys())
		}
		if(csrf)
			headers['CSRF-Token'] = csrf.getAttribute('content');	// (from Turbo Frames, but X prefix deprecated)
		if(opt.enctype) {
			if( (opt.enctype !== 'multipart/form-data' && opt.datas instanceof FormData) || !opt.datas instanceof FormData)
				headers['Content-Type'] = opt.enctype	// attention au boundary : https://muffinman.io/blog/uploading-files-using-fetch-multipart-form-data/
		}
		
		busy(true)
		fetch(url,{headers, method : opt.method, body : opt.datas})
			.then(response => {
				if (!response.ok)
					return opt.error(response)	// http error
				return response.text()
			})
			.then(opt.success)
			.catch(error => console.error(error))	// other error
			.finally(() => {
				busy(false)
			});
	}
	
	const restoreState = (state) => {
		if(!state)
			return false;
		const layoutToRestore = cachedLayouts[state.layoutKey];
		if(!layoutToRestore)
			return false;
		if(document.body != layoutToRestore)
			document.body.replaceWith(layoutToRestore);
		for(zId in state.zonesStatesKeys) {
			let zKey = state.zonesStatesKeys[zId]
			let zoneToRestore = cachedZonesStates[zId] && cachedZonesStates[zId][zKey];
			if(debug)
				console.log('zoneToRestore', zId, zKey, zoneToRestore)
			if(!zoneToRestore)
				return false;
			let zToReplace = document.getElementById(zId)
			if(zToReplace != zoneToRestore) {
				zToReplace.after(zoneToRestore);	// inject
				zToReplace.parentNode.removeChild(zToReplace);	// remove
			}
		}
		
		while (document.body.attributes.length > 0) {
			document.body.removeAttribute(document.body.attributes[0].name);
		}
		
		for(attr in state.bodyAttributes)
			document.body.setAttribute(attr, state.bodyAttributes[attr]);
		return true;
	}
	

	const isAllowedURL = (url) => {
		
		if(!url.startsWith(location.origin))
			false;
		for(prefix of sameContextSources) {
			if(url.startsWith(prefix))
				return true;
		}
		return false;
	}
	
	const busy = (isBusy, dom) => {
		if(!dom)
			dom = document;
		
		for(z of dom.querySelectorAll('[d-zone]'))
			if(isBusy)
				z.setAttribute('aria-busy', 'true')
			else
				z.removeAttribute('aria-busy')
		if(isBusy)
			dom.body.setAttribute('aria-live', 'assertive');
		else
			dom.body.removeAttribute('aria-live', 'assertive');
		
	}
	
	const anchor = (url) => {
		const i = url.indexOf('#');
		const target = i !== -1 ? document.querySelector(url.slice(i)) : false;
		if(target) {
			if(debug)
				console.log('SCROLL')
			target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
		}
	}
	
	const formConfig = (formElement, submitter) => {
		// Valeurs par défaut
		const defaultConfig = {
			action: formElement.getAttribute('action') || '',
			enctype: formElement.getAttribute('enctype') || 'application/x-www-form-urlencoded',
			method: formElement.getAttribute('method') || 'get',
			novalidate: formElement.hasAttribute('novalidate'),
			target: getTarget(formElement)
		};

		// Si un submitter est fourni, utilisez ses attributs pour remplacer les valeurs par défaut
		if (submitter) {
			defaultConfig.action = submitter.getAttribute('formaction') || defaultConfig.action;
			defaultConfig.enctype = submitter.getAttribute('formenctype') || defaultConfig.enctype;
			defaultConfig.method = submitter.getAttribute('formmethod') || defaultConfig.method;
			defaultConfig.novalidate = submitter.hasAttribute('formnovalidate');
			defaultConfig.target = submitter.getAttribute('formtarget') || defaultConfig.target;
		}

		return defaultConfig;
	}
	
	const getTarget = (el) => {
		let target = el.getAttribute('formtarget') || el.getAttribute('target');

		if (!['_self', '_blank', '_parent', '_top'].includes(target)) {
			const baseElement = document.head.querySelector('base');
			target = baseElement ? baseElement.getAttribute('target') : null;
		}

		switch (target) {
			case '_parent':
			case '_top':
				return window.parent !== window ? '_self' : target;
			case '_blank':
				return '_blank';
			default:
				return '_self';
		}
	};
	
	const testRelations = (el) => {
		for(rel of ['external', 'noopener', 'opener', 'noreferer'])
			if(el.relList.contains(rel))
				return false;
		return true;
	}
	
	window.addEventListener("DOMContentLoaded", (event) => {
		
		if(!currentLayoutKey()) {
//console.warn('No d-layout attribute on body. State zone navigation aborted.')
			return;
		}
		
		const metaSC = document.querySelector('meta[name="sameContext"]')
		if(metaSC) {
			sameContextSources = []
			for(src of metaSC.getAttribute('content').split(';')) {
				src = src.trim();
				if(!src)
					continue;
				if(src.startsWith(location.origin))
					sameContextSources.push(src);
				else
					console.warn('Same context source must have same origin. Ignored ' + src)
			}
		}
		
		saveState(currentURL(), currentState(), true)
		
		document.addEventListener('click', (ev) => {
			el = ev.target;
			if(ev.type === 'click') {
				if(getTarget(el) !== '_self')
					return;
				const isLink = (el.matches('a[href], area[href]') || el.role === 'link')
				if(isLink && el.href && isAllowedURL(el.href) && testRelations(el)) {
					ev.preventDefault();
					const currentUrl = currentURL();
					const isLocalAnchor = el.href.startsWith(currentUrl+'#')
					if(isLocalAnchor) {
						anchor(el.href)		// https://krasimirtsonev.com/blog/article/anchor-links-and-popstate
						saveState(el.href, currentState())
					}
					else {
						process(el.href);
					}
				}
			}
		});
		
		document.addEventListener('submit', function (event) {
			const form = event.target, cfg = formConfig(form, event.submitter)
			if(!isAllowedURL(cfg.action) || !testRelations(form) || cfg.target !== '_self' || cfg.method === 'dialog')
				return;
			event.preventDefault();
			const isValid = form.reportValidity();
			if(isValid) {
				process(cfg.action, {
					method : cfg.method,
					datas: new FormData(cfg.target),
					enctype: cfg.enctype
				})
			}
		  
		});
		
		window.addEventListener("popstate", (event) => {
			busy(true)	// semble inutile, mais il est possible que de gros morceau de dom prennent du temps à être replacés même à partir du cache. [HYPOTHESE]
			let result = restoreState(event.state)
			if(debug)
				console.log(result, event.state)
			if(!result)
				process(location.href, {updateState : true})	// On doit reconstituer le cache.
			else {
				if(location.href.indexOf('#')) {
					anchor(location.href)
				}
				busy(false)	// semble inutile, cf juste en haut.
			}
		});
		
	})
	
	return {
		currentState,
		visit : process,
		getAlreadyStoredKeys,
		removeCachedLayout: (layout) => {
			delete cachedLayouts[layout]
		},
		removeCachedZoneState: (id, key) => {
			delete cachedZonesStates[id][key]
		}
	}
    
})();
