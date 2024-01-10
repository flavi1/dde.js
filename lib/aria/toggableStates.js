const toggableStates = (function() {
	
	const debug = true;
	const alreadyEhanced = new Map();
	
	const HTMLNativeStateAttributes = ['checked']

	var rememberStates = {};
	
	const rememberState = (el) => {
		if(!el.id)
			return;
		const attr = getRelevantStateAttributeName(el)
		if(!rememberState[el.id])
			rememberState[el.id] = {}
		if(!HTMLNativeStateAttributes.includes(attr))
			rememberState[el.id] = el.getAttribute(attr) === 'true';
		else
			rememberState[el.id] = el[attr]
//console.log('rememberState', rememberState[el.id], el)
	}
	
	const rememberControlledStates = (dom, el) => {
		for(id of el.getAttribute('aria-controls').split(' '))
			rememberState(dom.querySelector('[id='+id+']'))
	}
	
	const setState = (el, value) => {
		const attr = getRelevantStateAttributeName(el)
		const boolean = HTMLNativeStateAttributes.includes(attr)
		if(!boolean)
			el.setAttribute(attr, value ? 'true' : 'false');
		else {
			el[attr] = value;
		}
	}
	
	const restoreControlledStates = (dom, el, treatOnlyParentEl) => {
		var allFalse = true
		var oneOrManyFalse = false
		var result = '';
		for(id of el.getAttribute('aria-controls').split(' '))
			if(rememberState[id]) {
				if(!treatOnlyParentEl)
					setState(dom.querySelector('[id='+id+']'), rememberState[id])
				allFalse = false;
			}
			else
				oneOrManyFalse = true;
		const attr = getRelevantStateAttributeName(el)
		if(allFalse)
			return el.setAttribute(attr, 'false')
		if(!oneOrManyFalse)
			return el.setAttribute(attr, 'true')
		return el.setAttribute(attr, 'mixed');
	}
	
	const setControlledStates = (dom, el, value) => {
		for(id of el.getAttribute('aria-controls').split(' '))
			setState(dom.querySelector('[id='+id+']'), value)
	}
	
	const getRelevantStateAttributeName = (el) => {
		if(el.matches('input[type=checkbox], input[type=radio]'))
			return 'checked';
		const role = el.role || el.getAttribute('role');
		if(el.matches('button, input:is([type="button"], [type="submit"], [type="reset"], [type="image"], [type="file"])') || role === 'button')
			return 'aria-pressed';
		if(['checkbox', 'radio', 'menuitemcheckbox', 'menuitemradio'].includes(role))
			return 'aria-checked';
	}
	
	const triStateHandler = (dom, el, init) => {		// TODO : aria-controls & remember states
		const triState = el.hasAttribute('aria-controls');
		if(init) {
			if(!triState)
				rememberState(el)
			return;
		}
		const attr = getRelevantStateAttributeName(el)
		const triStateParent = el.id ? dom.querySelector('[aria-controls~='+el.id+']') : null
console.log(el, attr, triStateParent)
		if(HTMLNativeStateAttributes.includes(attr)) {
			if(triStateParent) {
				rememberControlledStates(dom, triStateParent)
				restoreControlledStates(dom, triStateParent, true)
			}
			return;
		}
		if(!el.hasAttribute(attr))
			el.setAttribute(attr, 'false')
		var ariaState = el.getAttribute(attr)
		var cycle = triState ? {
			'false' : 'mixed',
			'mixed' : 'true',
			'true' : 'false',
		} : {
			'false' : 'true',
			'mixed' : 'true',		// mixed MUST be treat as false when no supported.
			'true' : 'false',
		};
		if (!['true', 'false', 'mixed', 'undefined'].includes(ariaState))
			console.warn(ariaState + ' is not a correct '+attr+' attribute value.', el)
		else if (ariaState != 'undefined') {
			if(el.hasAttribute('aria-controls') && ariaState === 'false') {
				var allChildrenFalse = true
				for(id of el.getAttribute('aria-controls').split(' ')) {
					if(rememberState[id])
						allChildrenFalse = false
				}
				if(allChildrenFalse)
					ariaState = 'mixed'	// so next = true, to not break the cycle.
			}
			el.setAttribute(attr, cycle[ariaState]);
		}
		if(!triState) {
			if(triStateParent) {
				rememberControlledStates(dom, triStateParent)
				restoreControlledStates(dom, triStateParent, true)
			}
		}
		else switch(cycle[ariaState]) {
			case 'mixed':
				restoreControlledStates(dom, el);
				break;
			case 'true':
				setControlledStates(dom, el, true);
				break;
			case 'false':
				setControlledStates(dom, el, false);
				break;
		}
			
	}
	

	
	const expandableHandler = (dom, el, init) => {
		if(!el.hasAttribute('aria-expanded') && el.hasAttribute('data-expand-handler')) {
			el = el.parentNode;
		} else {
			for(c of el.children)
				if(c.hasAttribute('data-expand-handler'))
					return;
		}
		
		const state = el.getAttribute('aria-expanded')
		const controlledElements = ariaResolver.getControlledElements(dom, el)
		if(init) {
			for(ce of controlledElements)
				ce.hidden = state === 'true' ? false : true;
		}
		else {
			
			if(el.role === 'tab') {
				const tablist = el.parentNode.closest('[role="tablist"]')		
				const tabs = tablist.querySelectorAll('[role="tab"][aria-expanded]')		
				for(c of tabs) {
					let isSelectedTab = c === el;
					c.setAttribute('aria-expanded', isSelectedTab ? 'true' : 'false')		
					for(tp of ariaResolver.getControlledElements(dom, c)) {
						tp.hidden = isSelectedTab ? false : true;
					}

				}
			} else {
				el.setAttribute('aria-expanded', state === 'true' ? 'false' : 'true');
				for(ce of controlledElements)
					ce.hidden = state === 'true' ? true : false;	
			}
			
		}
	}
	
	const selectableHandler =  (dom, el, init) => {
		const groupElementSelectors = {
			'gridcell' : '[role=grid], [role=treegrid]',	// + row ? https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/gridcell_role
			'option' : '[role=listbox]',
			'row' : '[role=grid], [role=treegrid], [role=table], [role=rowgroup]',	// https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/row_role
			'tab' : '[role=tablist]',	// TODO : aria-controls => tabpanel comme pour aria-expanded
			'treeitem' : '[role=tree]'
		}
		const parent = el.parentNode.closest(groupElementSelectors[el.role]);
		const multiple = parent.getAttribute('aria-multiselectable') === 'true'
/*		if(init) {
			if(el.role === 'tab') {
				for(c of ariaResolver.getControlledElements(dom, el))
					c.hidden = el.getAttribute('aria-selected') === 'false' ? true : false;
			}
			return;
		}	*/
		if(multiple) {
			el.setAttribute('aria-selected', el.getAttribute('aria-selected') === 'false' ? 'true' : 'false')
			return;
		}
		for(c of parent.querySelectorAll('[aria-selected]')) {
			c.setAttribute('aria-selected', (c === el) ? 'true' : 'false')
/*			if(c.role === 'tab') {
				for(tc of ariaResolver.getControlledElements(dom, c))
					tc.hidden = c.getAttribute('aria-selected') === 'false' ? true : false;
			} */
		}
	}
	
	const radioHandler =  (dom, el, init) => {
		const parent = el.parentNode.closest('[role=radiogroup]');
		if(init)
			return;
		if(parent)
			for(c of parent.querySelectorAll('[role=radio], [role=menuitemradio]')) {
				if(c.parentNode.closest('[role=radiogroup]') === parent)
					c.setAttribute('aria-checked', (c === el) ? 'true' : 'false')
			}
		else
			el.setAttribute('aria-checked', 'true')
	}
	
	const handlers = {
		'[aria-expanded], [aria-expanded] > [data-expand-handler]' : {'expand' : expandableHandler},
		'[aria-pressed]' :  {'default' : triStateHandler},
		'[role="checkbox"], [role="menuitemcheckbox"], input[type=checkbox]' : {'default' : triStateHandler},	// input for remember states + TODO : radio / menuitemradio !
		'[role="radio"], [role="menuitemradio"]' : {'default' : radioHandler}, // input for remember states + TODO : radio / menuitemradio !
		'[aria-selected], [role="option"]' : {'default' : selectableHandler},
	}
	
	const undo = (el) => {
		if (!el) {
			return false;
		}
		
		if (el.nodeType === Node.DOCUMENT_NODE) {
			el = dom.documentElement;
		}
		const listenerToRemove = alreadyEhanced.get(el);
		el.removeEventListener('default', listenerToRemove, true)
		el.removeEventListener('expand', listenerToRemove, true)
		return alreadyEhanced.delete(el);
	}
	
	const apply = (dom) => {
		if (!dom) {
			return false;
		}
		
		if (dom.nodeType === Node.DOCUMENT_NODE) {
			dom = dom.documentElement;
		}
		
		if(alreadyEhanced.has(dom))
			return;
		
		const catchElement = (ev) => {
			const el = ev.target
			var _el = el, els = [];
			while (_el.nodeType === Node.ELEMENT_NODE) {
				els.push(_el);
				_el = _el.parentNode;
			}
			for(_el of els) {
				for(sel in handlers) {
					if(_el.matches(sel)) {
						return _el;
					}
				}
			}
		}
		
		const listener = (ev) => {
			const el = catchElement(ev);
			if(!el)
				return;
			for(sel in handlers) {
				if(el.matches(sel)) {
					if(handlers[sel][ev.type])
						handlers[sel][ev.type](dom, el);
					if(debug) console.log(ev.type, el)
				}
			}
			
		}
		alreadyEhanced.set(dom, listener);
		dom.addEventListener('default', listener, true);
		dom.addEventListener('expand', listener, true);
		
		dom.querySelectorAll('*').forEach((el) => {
			if(alreadyEhanced.has(el))
				undo(el)
		})
		
		for(sel in handlers) {
			for(evType in handlers[sel]) {
				dom.querySelectorAll(sel).forEach((el) => {
					handlers[sel][evType](dom, el, true)
				});
				if(dom.matches(sel))
					handlers[sel][evType](dom, dom, true)
			}
		}
	}
	
	return {
		apply,
		undo,
		alreadyEhanced
	};
    
})();
