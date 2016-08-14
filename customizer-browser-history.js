/* global wp */
/* exported CustomizerBrowserHistory */
/* eslint no-magic-numbers: ["error", { "ignore": [0,1,2,10] }] */
/* eslint complexity: ["error", 8] */

var CustomizerBrowserHistory = (function( api, $ ) {
	'use strict';

	var component = {
		defaultPreviewedDevice: null,
		expandedPanel: new api.Value(),
		expandedSection: new api.Value(),
		expandedControl: new api.Value(),
		previewScrollPosition: new api.Value( 0 )
	};

	/**
	 * Get current query params.
	 *
	 * @param {string} url URL.
	 * @returns {object} Query params.
	 */
	component.getQueryParams = function getQueryParams( url ) {
		var urlParser, queryParams, queryString;
		urlParser = document.createElement( 'a' );
		urlParser.href = url;
		queryParams = {
			url: api.settings.url.preview,
			device: component.defaultPreviewedDevice
		};
		queryString = urlParser.search.substr( 1 );
		if ( queryString ) {
			_.each( queryString.split( '&' ), function( pair ) {
				var parts = pair.split( '=', 2 );
				if ( parts[0] && parts[1] ) {
					queryParams[ decodeURIComponent( parts[0] ) ] = decodeURIComponent( parts[1] );
				}
			} );
		}

		// Cast scroll to integer.
		if ( ! _.isUndefined( queryParams.scroll ) ) {
			queryParams.scroll = parseInt( queryParams.scroll, 10 );
			if ( isNaN( queryParams.scroll ) ) {
				delete queryParams.scroll;
			}
		}

		return queryParams;
	};

	/**
	 * Update the URL state with the current Customizer state, using pushState for url changes and replaceState for other changes.
	 *
	 * @returns {void}
	 */
	component.updateState = _.debounce( function updateState() {
		var expandedPanel = '', expandedSection = '', expandedControl = '', values, urlParser, oldQueryParams, newQueryParams;

		api.panel.each( function( panel ) {
			if ( panel.active() && panel.expanded() ) {
				expandedPanel = panel.id;
			}
		} );
		api.section.each( function( section ) {
			if ( section.active() && section.expanded() ) {
				expandedSection = section.id;
			}
		} );
		if ( expandedSection ) {
			api.control.each( function( control ) {
				if ( expandedSection && control.active() && control.expanded && control.expanded() ) {
					expandedControl = control.id;
				}
			} );
		}

		component.expandedPanel.set( expandedPanel );
		component.expandedSection.set( expandedSection );
		component.expandedControl.set( expandedControl );
		component.previewScrollPosition.set( api.previewer.scroll );

		oldQueryParams = component.getQueryParams( location.href );
		newQueryParams = {};
		values = {
			url: api.previewer.previewUrl,
			'autofocus[panel]': component.expandedPanel,
			'autofocus[section]': component.expandedSection,
			'autofocus[control]': component.expandedControl,
			device: api.previewedDevice,
			'scroll': component.previewScrollPosition
		};

		// Preserve extra vars.
		_.each( _.keys( oldQueryParams ), function( key ) {
			if ( 'undefined' === typeof values[ key ] ) {
				newQueryParams[ key ] = oldQueryParams[ key ];
			}
		} );

		_.each( values, function( valueObj, key ) {
			var value = valueObj.get();
			if ( value ) {
				newQueryParams[ key ] = value;
			}
		} );

		if ( ! _.isEqual( newQueryParams, oldQueryParams ) ) {
			urlParser = document.createElement( 'a' );
			urlParser.href = location.href;
			urlParser.search = _.map( newQueryParams, function( value, key ) {
				var pair = encodeURIComponent( key ) + '=' + encodeURIComponent( value );
				pair = pair.replace( /%5B/g, '[' ).replace( /%5D/g, ']' );
				return pair;
			} ).join( '&' );

			if ( newQueryParams.url !== oldQueryParams.url ) {
				history.pushState( newQueryParams, '', urlParser.href );
			} else {
				history.replaceState( newQueryParams, '', urlParser.href );
			}
		}
	} );

	/**
	 * On history popstate, set the URL to match.
	 *
	 * @param {jQuery.Event} event Event.
	 * @returns {void}
	 */
	component.onPopState = function onPopState( event ) {
		var url = null;

		// Preserve the old scroll position.
		if ( event.originalEvent.state && event.originalEvent.state.scroll ) {
			api.previewer.scroll = event.originalEvent.state.scroll;
		} else {
			api.previewer.scroll = 0;
		}

		// Update the url.
		if ( event.originalEvent.state && event.originalEvent.state.url ) {
			url = event.originalEvent.state.url;
		} else {
			url = api.settings.url.preview; // On pop to initial state, the state is null.
		}
		api.previewer.previewUrl.set( url );
	};

	/**
	 * Watch for changes to a construct's active and expanded states.
	 *
	 * @param {wp.customize.Panel|wp.customize.Section|wp.customize.Control} construct Construct.
	 * @returns {void}
	 */
	component.watchExpandedChange = function watchExpandedChange( construct ) {
		if ( construct.active ) {
			construct.active.bind( component.updateState );
		}
		if ( construct.expanded ) {
			construct.expanded.bind( component.updateState );
		}
	};

	/**
	 * Unwatch for changes to a construct's active and expanded states.
	 *
	 * @param {wp.customize.Panel|wp.customize.Section|wp.customize.Control} construct Construct.
	 * @returns {void}
	 */
	component.unwatchExpandedChange = function watchExpandedChange( construct ) {
		if ( construct.active ) {
			construct.active.unbind( component.updateState );
		}
		if ( construct.expanded ) {
			construct.expanded.unbind( component.updateState );
		}
	};

	/**
	 * Find default previewed device.
	 *
	 * @returns {string} Device.
	 */
	component.findDefaultPreviewedDevice = function findDefaultPreviewedDevice() {
		var defaultPreviewedDevice = null;
		_.find( api.settings.previewableDevices, function checkDefaultPreviewedDevice( params, device ) {
			if ( true === params['default'] ) {
				defaultPreviewedDevice = device;
				return true;
			}
			return false;
		} );
		return defaultPreviewedDevice;
	};

	api.bind( 'ready', function onCustomizeReady() {
		var currentQueryParams;

		// Short-circuit if not supported.
		if ( ! history.replaceState || ! history.pushState ) {
			return;
		}

		currentQueryParams = component.getQueryParams( location.href );

		component.defaultPreviewedDevice = component.findDefaultPreviewedDevice();
		if ( currentQueryParams.scroll ) {
			component.previewScrollPosition.set( currentQueryParams.scroll );
			api.previewer.scroll = component.previewScrollPosition.get();
		}

		$( window ).on( 'popstate', component.onPopState );

		component.expandedPanel.set( api.settings.autofocus.panel || '' );
		component.expandedSection.set( api.settings.autofocus.section || '' );
		component.expandedControl.set( api.settings.autofocus.control || '' );

		api.control.each( component.watchExpandedChange );
		api.section.each( component.watchExpandedChange );
		api.panel.each( component.watchExpandedChange );

		api.control.bind( 'add', component.watchExpandedChange );
		api.section.bind( 'add', component.watchExpandedChange );
		api.panel.bind( 'add', component.watchExpandedChange );

		api.control.bind( 'remove', component.watchExpandedChange );
		api.section.bind( 'remove', component.watchExpandedChange );
		api.panel.bind( 'remove', component.watchExpandedChange );

		api.previewedDevice.bind( component.updateState );
		api.previewer.previewUrl.bind( component.updateState );
		api.previewer.bind( 'scroll', component.updateState );
		component.previewScrollPosition.bind( component.updateState );
	} );

	return component;

})( wp.customize, jQuery );
