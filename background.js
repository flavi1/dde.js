const debug = true;
var enabledJS = false;
const CS = chrome.contentSettings;
let JSConfig = {
}

CS.javascript.get({
	primaryUrl : 'http://*'
}, function(details) {
	enabledJS = details.setting === 'allow'
	console.log('GET INIT GLOBAL JS STATE : ', details.setting)
});

chrome.windows.onCreated.addListener((ev) => {
	
	CS.javascript.clear({}, () => {
		switchJS(enabledJS);	// global
		
	chrome.storage.sync.get({JSConfig : []}).then((vars) => {
		const _JSConfig = vars.JSConfig
console.log('_JSConfig init', _JSConfig)
		for(url in _JSConfig) {
			if(_JSConfig[url] == 'once') {
				delete _JSConfig[url];
				value = false //enabledJS ? 'allow' : 'block';
				console.log('JS ONCE RULE REMOVED ' + url);
			}
			else {
				if(_JSConfig[url] === 'never')
					value = 'block'
				if(_JSConfig[url] === 'always')
					value = 'allow'
			}
			if(value)
				CS.javascript.set({
					primaryPattern: url,
					setting: value
				});
			
		}
		chrome.storage.sync.set({JSConfig : _JSConfig})
		JSConfig = _JSConfig
console.log('_JSConfig restored', _JSConfig)
		
	});
		
	});

});

const switchJS = (state, url) => {
	if(!url) {
		enabledJS = state,
		value = state ? 'allow' : 'block'	// boolean for global JS state
		url = '<all_urls>'
	}
	else {
		if(!['never', 'once', 'always'].includes(state))
			return console.error('unkown JS state '+ state)
		
		if(['once', 'always'].includes(state)) {
			value = 'allow'
		}
		else {
			value = 'block'
		}
		
		if(JSConfig[url] === state)
			return value; // nothing to do.
		
		JSConfig[url] = state;
		chrome.storage.sync.set({JSConfig : JSConfig})
	}
console.log('URL ?', url)
	CS.javascript.set({
		primaryPattern: url ? url : '<all_urls>',
		setting: value
	}, () => {
		if(!debug)
			return;
		if(url)
			console.log('JS SETTINGS FOR ' + url + ' = ' + value + ' (' + state + ')')
	});
	return value;
}

const implementations = {
	'0.1' : {
		'ISOLATED' : [
			"lib/aria/ariaResolver.js",
			"lib/aria/click.js",
			"lib/aria/actionnable.js",
			"lib/aria/toggableStates.js",
			"lib/aria/simpleNavigation.js",
			"lib/aria/nestedNavigation.js",
			"lib/aria/main.js",
			"lib/zonesStates/zonesStates.js",
			//	"test.js",
			"end.js",
		],
		'MAIN' : [
		]
	}
}


// possible amélioration : chrome.tabs.onUpdated.addListener ?

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	console.log(request, sender, sendResponse);
	if(request.action === 'loadImplementation') {
		const v = request.version;
		var styles = [];

		if(implementations[v])
			for(world in implementations[v]) {
				if(implementations[v][world].length) {
					var scripts = [];
					for(s of implementations[v][world]) {
						if(s.endsWith('.css'))
							styles.push(s)
						else if(s.endsWith('.js'))
							scripts.push(s)
					}
					if(scripts.length)
						chrome.scripting.executeScript({
							target: {tabId: sender.tab.id},
							files: scripts,
							world: world
						}).catch((error) => {chrome.tabs.reload(); console.log(sender.origin+' reloaded');});	// chrome fix
				}
			}

		sendResponse({
			implemented : implementations[v] ? true : false,
			styles : styles,	// TODO
			JSState: enabledJS
		})
	}
	if(request.action === 'updateJSState') {
		if(request.url) {
			state = switchJS(request.JSState, request.url)	// url : once / always / never
			if( (!enabledJS && state === 'allow') || (enabledJS && state == 'block') )
				sendResponse({reload : true, state, enabledJS});
			else
				sendResponse({reload : false, state, enabledJS});
		}
		else
			switchJS(request.JSState)	// global boolean
	}
	if(request.action === 'getJSState') {
		const url = sender.origin + '/*'
		// console.warn('getJSState from ', sender.origin)
		var state = enabledJS;
console.log(JSConfig[url])
		if(!enabledJS && ['once', 'always'].includes(JSConfig[url]))
			state = 'allow';
		else if(enabledJS && JSConfig[url] === 'never')
			state = 'block';
		sendResponse({
			JSGlobalState : enabledJS,
			JSState : state,
			JSConfig : JSConfig[sender.origin + '/*'] ? JSConfig[url] : false
		})
	}
});
