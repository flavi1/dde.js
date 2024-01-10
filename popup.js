
const cb = document.getElementById('js-switcher')
chrome.runtime.sendMessage({action : 'getJSState'}, (response) => {
	cb.checked = response.JSGlobalState
})
cb.addEventListener('change', () => {
	chrome.runtime.sendMessage({action : 'updateJSState', JSState : cb.checked})
})



chrome.action.setIcon({ path: '/icons/popup-default.svg' })

const updatePopupState = (opt) => {
	console.log('OK', opt)
	for(div of document.querySelectorAll('#status > div')) {
		if(div.getAttribute('id') != opt.status)
			div.hidden = true;
		else
			div.hidden = false;
		console.log(div, div.getAttribute('id') != opt.status)
	}
	const modeDiv = document.querySelector('#modes #'+opt.mode)
	if(modeDiv) {
		document.querySelector('#modes').hidden = false;
		modeDiv.classList.add('current')
	}
	document.querySelector('#mode').innerHTML = opt.mode;
	document.querySelector('#version').innerHTML = opt.version;
	
	chrome.action.setIcon({ path: '/icons/popup-' + opt.mode + '.svg' })
}

function sendToCurrenTab(options, callback) {
	chrome.tabs.query({active: true, currentWindow: true},function(tabs) {
	  chrome.tabs.sendMessage(tabs[0].id, options, callback);
	}); 
}

sendToCurrenTab({action: "getDDEPageInfo", enabledJS : cb.checked}, function(status) {
	if(status)
		updatePopupState(status)
})

/*


const STSwitsher = document.getElementById('style-theme-switcher');


sendToCurrenTab({action: "getStyleThemes"}, function(themes) {
	if(themes.length) {	
		for(t of themes.all) {
			console.log(t)
			o = document.createElement('option');
			o.value = t.name;
			o.textContent = t.name;
			if(t.isCurrent)
				o.selected = true;
			STSwitsher.append(o)
		}
		document.getElementById('themes').hidden = false
	}
})

STSwitsher.addEventListener('change', (e) => {
	sendToCurrenTab({action: "setStyleTheme", themeName : STSwitsher.value})
})
 */
