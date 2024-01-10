const actionnable = (function() {
	
	const debug = true;
	var alreadyEhanced = {};
	const actionnableTypes = ['button', 'link', 'checkbox', 'radio', 'option', 'treeitem'];
	
	const behaviorsTypes = {
		'link' : 'a[href], area[href]',
		'button' : 'button, input:is([type="button"], [type="submit"], [type="reset"], [type="image"], [type="file"])',	// note that behaviors types are more than implicit roles
		'checkbox' : 'input[type=checkbox]',
		'radio' : 'input[type=radio]',
		'option' : 'option',
		'treeitem' : null
	}
	
	
	const rolesBehaviorsTypes = {
		'menuitemcheckbox' : 'checkbox',
		'menuitemradio' : 'radio'
	}
	
	const reDispatchEvent = (ev, as) => {
		const newtEv = new CustomEvent(as, {
		  detail: {
			from: ev,
		  },
		  bubbles:true
		});

		return ev.target.dispatchEvent(newtEv);
	}
	
	const KIbehaviors = {
		'preventPageScrolling' : (ev) => {ev.preventDefault()},
		'default' : (ev) => {reDispatchEvent(ev, 'default')},
		'expand' : (ev) => {reDispatchEvent(ev, 'expand')},
	}

	const expectedKeyboardInteractions = {	// Check if behavior is present on element / Add if no present on non natives Role
		'button' : {
			Space : {
				keydown : ['preventPageScrolling'],
				keyup : ['default', 'expand'],
			},
			Enter : {keydown :[ 'default', 'expand']}
		},
		'link' : {
			Enter : {keydown : ['default']}
		},
		'checkbox' : {
			Space : {
				keydown : ['preventPageScrolling'],
				keyup : ['default'],
			},
		},
		'radio' : {
			Space : {
				keydown : ['preventPageScrolling'],
				keyup : ['default'],
			},
		},
		'option' : {
			Space : {keydown : ['preventPageScrolling', 'default']},
			Enter : {keydown : ['default']},
		},
		'treeitem' : {
			Space : {keydown : ['preventPageScrolling', 'default']},
			Enter : {keydown : ['default']},
		},
	}
	
	const extraKeyboardInteractions = {		// Add if no present on natives AND non natives
		'radio' : {
			Enter : {keydown : ['default']}	// optionnal
		},
		'checkbox' : {
			Enter : {keydown : ['default']}	// is it allowed ?
		}
	}
	
	
	function collectKeyboardInteractions(nativeType, bTypeToImplement, type, code) {
		const expectedKIs = expectedKeyboardInteractions[bTypeToImplement];
		const extraKIs = extraKeyboardInteractions[bTypeToImplement] || {};
		const nativeKIs = expectedKeyboardInteractions[nativeType] || {};
		var KIs = [];
		
		if(!expectedKIs[code] || !expectedKIs[code][type] || nativeType === bTypeToImplement) {
			KIs = [];	// NOTHING TO IMPLEMENT
		} else if(!nativeKIs[code] || !nativeKIs[code][type]) {
			KIs = expectedKIs[code][type];	// ALL TO IMPLEMENT
		} else {
			for(ki of expectedKIs[code][type]) {
				if(!nativeKIs[code][type].includes(ki))		// SOME KI TO IMPLEMENT
					KIs.push(ki)
			}
		}
		
		if(extraKIs[code] && extraKIs[code][type]) {	// EXTRAS
			for(ki of extraKIs[code][type]) {
				if(!nativeKIs[code] || !nativeKIs[code][type] || !nativeKIs[code][type].includes(ki))
					KIs.push(ki)
			}
		}
		
		if(KIs.length && debug) console.log(nativeType + ' to ' + bTypeToImplement, KIs)
		
		return KIs;
	}
	
	
	for(r of actionnableTypes)
		alreadyEhanced[r] = new Map()
	
	const wrapper = (el, bType, callback) => {
		if (!el) {
			return false;
		}
		
		if (el.nodeType === Node.DOCUMENT_NODE) {
			el = el.documentElement;
		}
		if(!bType) {
			const results = actionnableTypes.map((_bType) => {return callback(el, _bType);})

			for(r of results) {
				if(r)
					return true;
			}
			return false;
		}
		return callback(el, bType);
	}
	
	const setEvents = (el, listener, remove) => {
		const evTypesCapturable = {
			'default' : true,
			'expand' : true,
			'keydown' : false,
			'keyup' : false,
		}
		for(t in evTypesCapturable)
			if(remove)
				el.removeEventListener(t, listener, evTypesCapturable[t]);
			else
				el.addEventListener(t, listener, evTypesCapturable[t]);
	}
	
	const undo = (el, bType) => {
		const listenerToRemove = alreadyEhanced[bType].get(el);
		
		if(!listenerToRemove)
			return false;
		
		setEvents(el, listenerToRemove, true)
		
		return alreadyEhanced[bType].delete(el);
	}
	
	const apply = (dom, bTypeToImplement) => {

		if (!isAlreadyEhanced(dom)) {
			
			const commonListener = (ev) => {
				const el = ev.target;
				if(getEffectiveBType(el) !== bTypeToImplement)
					return;

				if(debug && ['default', 'expand'].includes(ev.type)) {
					console.log('OK', ev.type, bTypeToImplement, el);
}
				const nativeType = getNativeBType(el)
				const effectiveBType = getEffectiveBType(el);
				if(typeof expectedKeyboardInteractions[effectiveBType] === 'undefined')
					return;
				if(['keydown', 'keyup'].includes(ev.type)) {
					const elementKIs = collectKeyboardInteractions(nativeType, bTypeToImplement, ev.type, ev.code);
					for(KI of elementKIs)
						KIbehaviors[KI](ev);
				}
			}
			
			

			alreadyEhanced[bTypeToImplement].set(dom, commonListener);
			
			setEvents(dom, commonListener)

			if( (hasExpectedNativeBehavior(dom) || hasExpectedExplicitRole(dom)) && !isDisabled(dom))
				ensureFocusable(dom);

			dom.querySelectorAll('*').forEach((el) => {
				if(alreadyEhanced[bTypeToImplement].has(el))
					undo(el, bTypeToImplement)
				else if( (hasExpectedNativeBehavior(el) || hasExpectedExplicitRole(el))  && !isDisabled(el))
					ensureFocusable(el);
			});
			return true;
		}
		else
			return false;

		function isDisabled(el) {
			if(el.getAttribute('aria-disabled') === 'true' || el.matches('[aria-disabled] el'))
				return true;
			return false;
		}

		function isAlreadyEhanced(el) {
			let currentElement = el;

			while (currentElement) {
				if (alreadyEhanced[bTypeToImplement].has(currentElement)) {
					return true;
				}
				currentElement = currentElement.parentElement;
			}

			return false;
		}

		function isFocusable(el) {
			const cs = window.getComputedStyle(el, null);
			if (cs.getPropertyValue('visibility') == 'hidden' || cs.getPropertyValue('display') == 'none')
				return false;
			const natively = 'a[href], area[href], details, iframe, :is(button, input:not([type="hidden"]), select, textarea)';

			if (el.matches(natively) || (el.hasAttribute('tabindex') && parseInt(el.getAttribute('tabindex')) >= 0) || el.isContentEditable)
				return true;
			return false;
		}
		
		function getNativeBType(el) {
			for(bType in behaviorsTypes)
				if(el.matches(behaviorsTypes[bType]))
					return bType;
			return null;
		}
		
		function hasExpectedNativeBehavior(el) {
			return el.matches(behaviorsTypes[bTypeToImplement]);
		}

		function hasExpectedExplicitRole(el) {
			const role = el.role || el.getAttribute('role');
			return (role === bTypeToImplement || rolesBehaviorsTypes[role] === bTypeToImplement);
		}

		function getEffectiveBType(el) {
			const native = getNativeBType(el);
			const role = el.role || el.getAttribute('role');
			const effectiveBType = rolesBehaviorsTypes[role] ? rolesBehaviorsTypes[role] : role;
			return effectiveBType || native;
		}

		function ensureFocusable(el) {
//if (debug) console.log('Make Focusable : ', el, isFocusable(el))
			if (!isFocusable(el)) {
				el.setAttribute('tabindex', '0');
			}
		}
		
	}
	
	return {
		apply : (el, bType) => {wrapper(el, bType, apply);},
		undo : (el, bType) => {wrapper(el, bType, undo);},
		alreadyEhanced
	};
    
})();
