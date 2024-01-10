const ariaResolver = {
	
		nestedExpandableAllowed : {
			'treeitem' : 'group'
		},
		
		controlledBy: new Map(),
		
		getAllowedNestedExpandable : (el) => {
			const expectedRole = ariaResolver.nestedExpandableAllowed[el.role]
			if(!expectedRole)
				return null;
			for(candidate of el.querySelectorAll('*')) {
				if(candidate.role == expectedRole)
					return candidate;
			}
			return null;
		},
		
		getControlledElements : (dom, el) => {
			var idsControlled = null;
			var candidate = null;
			if(el.hasAttribute('aria-controls'))
				idsControlled = el.getAttribute('aria-controls').split(' ');
			else if(el.hasAttribute('aria-owns'))
					idsControlled = [ el.getAttribute('aria-owns') ];
			var controlledElements = []
			if(idsControlled) {
				for(id of idsControlled) {
					controlledElements.push(dom.querySelector('[id="' + id + '"]'));
				}
			} else if(!el.hasAttribute('aria-owns') && !el.hasAttribute('aria-controls')) {
				candidate = ariaResolver.getAllowedNestedExpandable(el)
				if(candidate) {
					controlledElements.push(candidate)
				}
				else {
					candidate = el.nextSibling;
					while(candidate && candidate.nodeType != Node.ELEMENT_NODE) {
						candidate = candidate.nextSibling
					}
					if(candidate)
						controlledElements.push(candidate)
				}
					
			}
			console.log('controlledElements',el, controlledElements )
			for(c of controlledElements)
				ariaResolver.controlledBy.set(c, el);
			return controlledElements;
		}
}
