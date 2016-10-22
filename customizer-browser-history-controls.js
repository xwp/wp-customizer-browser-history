/* global wp */
/* exported CustomizerBrowserHistory */
/* eslint no-magic-numbers: ["error", { "ignore": [0,1,2,10] }] */
/* eslint complexity: ["error", 8] */

var CustomizerBrowserHistory = (function( api, $ ) {
	'use strict';

	var component = {
		defaultQueryParamValues: {},
		previousQueryParams: {},
		// historyPosition: 0, // @todo Eliminate???? Or we need to ensure it is preserved when replaceState is done.
		// currentHistoryState: null,
		expandedPanel: new api.Value(),
		expandedSection: new api.Value(),
		expandedControl: new api.Value(),
		previewScrollPosition: new api.Value( 0 )
	};

	// history.replaceState = ( function( nativeReplaceState ) {
	// 	return function historyReplaceState( data, title, url ) {
	// 		component.currentHistoryState = data;
	// 		return nativeReplaceState.call( history, data, title, component.injectUrlWithState( url ) );
	// 	};
	// } )( history.replaceState );
	//
	// history.pushState = ( function( nativePushState ) {
	// 	return function historyPushState( data, title, url ) {
	// 		component.currentHistoryState = data;
	// 		return nativePushState.call( history, data, title, component.injectUrlWithState( url ) );
	// 	};
	// } )( history.pushState );
	//
	// window.addEventListener( 'popstate', function( event ) {
	// 	component.currentHistoryState = event.state;
	// } );

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
		queryParams = {};

		// @todo The following can be replaced with wp.customize.utils.parseQueryString().
		queryString = urlParser.search.substr( 1 );
		if ( queryString ) {
			_.each( queryString.split( '&' ), function( pair ) {
				var parts = pair.split( '=', 2 );
				if ( parts[0] ) {
					queryParams[ decodeURIComponent( parts[0] ) ] = _.isUndefined( parts[1] ) ? null : decodeURIComponent( parts[1] );
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
	component.updateWindowLocation = _.debounce( function updateWindowLocation() {
		var expandedPanel = '', expandedSection = '', expandedControl = '', values, urlParser, oldQueryParams, newQueryParams, setQueryParams, state, urlChanged, changesetStatus;

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
				if ( expandedSection && control.section() === expandedSection && control.active() && control.expanded && control.expanded() ) {
					expandedControl = control.id;
				}
			} );
		}

		component.expandedPanel.set( expandedPanel );
		component.expandedSection.set( expandedSection );
		component.expandedControl.set( expandedControl );
		component.previewScrollPosition.set( api.previewer.scroll );

		if ( top === window ) {
			oldQueryParams = component.getQueryParams( location.href );
		} else {
			oldQueryParams = component.previousQueryParams;
		}
		newQueryParams = {};
		values = {
			'url': api.previewer.previewUrl,
			'autofocus[panel]': component.expandedPanel,
			'autofocus[section]': component.expandedSection,
			'autofocus[control]': component.expandedControl,
			'device': api.previewedDevice,
			'scroll': component.previewScrollPosition
		};

		// Preserve extra vars.
		_.each( _.keys( oldQueryParams ), function( key ) {
			if ( 'undefined' === typeof values[ key ] ) {
				newQueryParams[ key ] = oldQueryParams[ key ];
			}
		} );

		// Collect new query params.
		_.each( values, function( valueObj, key ) {
			var value = valueObj.get();
			if ( null !== value ) {
				newQueryParams[ key ] = value;
			}
		} );

		// Set the changeset_uuid query param.
		changesetStatus = api.state( 'changesetStatus' ).get();
		if ( '' !== changesetStatus && 'publish' !== changesetStatus ) {
			newQueryParams.changeset_uuid = api.settings.changeset.uuid;
		} else {
			delete newQueryParams.changeset_uuid;
		}

		if ( ! _.isEqual( newQueryParams, oldQueryParams ) ) {
			setQueryParams = {};
			_.each( newQueryParams, function( value, key ) {
				if ( value !== component.defaultQueryParamValues[ key ] ) {
					setQueryParams[ key ] = value;
				}
			} );

			urlParser = document.createElement( 'a' );
			urlParser.href = location.href;
			urlParser.search = _.map( setQueryParams, function( value, key ) {
				var pair = encodeURIComponent( key );
				if ( null !== value ) {
					pair += '=' + encodeURIComponent( value );
				}
				pair = pair.replace( /%5B/g, '[' ).replace( /%5D/g, ']' ).replace( /%2F/g, '/' ).replace( /%3A/g, ':' );
				return pair;
			} ).join( '&' );

			urlChanged = ( newQueryParams.url ) !== ( oldQueryParams.url || component.defaultQueryParamValues.url );
			// console.info( urlChanged );
			// console.info( 'newQueryParams.url', newQueryParams.url )
			// console.info( 'oldQueryParams.url', oldQueryParams.url || component.defaultQueryParamValues.url )
			// if ( urlChanged ) {
			// 	component.historyPosition += 1;
			// }

			state = {
				queryParams: newQueryParams,
				// historyPosition: component.historyPosition
			};

			// Send the state to the parent window.
			if ( top === window ) {
				if ( urlChanged ) {
					history.pushState( {}, '', urlParser.href );
				} else {
					history.replaceState( {}, '', urlParser.href );
				}
			} else {
				state.method = urlChanged ? 'pushState' : 'replaceState';
				component.parentMessenger.send( 'history-change', state );
				console.info( '[controls] history-change', state );
			}
			component.previousQueryParams = newQueryParams;
		}
	} );

	/**
	 * On history popstate, set the URL to match.
	 *
	 * @param {object} queryParams Query params.
	 * @returns {void}
	 */
	component.updatePreviewUrl = function updatePreviewUrl( queryParams ) {
		var url = null;

		// Preserve the old scroll position.
		if ( queryParams.scroll ) {
			api.previewer.scroll = queryParams.scroll;
		} else {
			api.previewer.scroll = 0;
		}

		// Update the url.
		if ( queryParams.url ) {
			url = queryParams.url;
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
			construct.active.bind( component.updateWindowLocation );
		}
		if ( construct.expanded ) {
			construct.expanded.bind( component.updateWindowLocation );
		}
		component.updateWindowLocation();
	};

	/**
	 * Unwatch for changes to a construct's active and expanded states.
	 *
	 * @param {wp.customize.Panel|wp.customize.Section|wp.customize.Control} construct Construct.
	 * @returns {void}
	 */
	component.unwatchExpandedChange = function unwatchExpandedChange( construct ) {
		if ( construct.active ) {
			construct.active.unbind( component.updateWindowLocation );
		}
		if ( construct.expanded ) {
			construct.expanded.unbind( component.updateWindowLocation );
		}

		// Because 'remove' event is triggered before the construct is removed. See #37269.
		_.delay( function() {
			component.updateWindowLocation();
		} );
	};

	/**
	 * Update window.location to sync with customizer state.
	 *
	 * @returns {void}
	 */
	component.startUpdatingWindowLocation = function startUpdatingWindowLocation() {
		var currentQueryParams = component.getQueryParams( location.href );

		if ( currentQueryParams.scroll ) {
			component.previewScrollPosition.set( currentQueryParams.scroll );
			api.previewer.scroll = component.previewScrollPosition.get();
		}

		component.defaultQueryParamValues = {
			'device': (function() {
				var defaultPreviewedDevice = null;
				_.find( api.settings.previewableDevices, function checkDefaultPreviewedDevice( params, device ) {
					if ( true === params['default'] ) {
						defaultPreviewedDevice = device;
						return true;
					}
					return false;
				} );
				return defaultPreviewedDevice;
			} )(),
			'scroll': 0,
			'url': api.settings.url.preview,
			'autofocus[panel]': '',
			'autofocus[section]': '',
			'autofocus[control]': ''
		};

		component.previousQueryParams = _.extend( {}, currentQueryParams );

		if ( top === window ) {
			$( window ).on( 'popstate', function onPopState( event ) {
				var urlParser, queryParams;
				urlParser = document.createElement( 'a' );
				urlParser.href = location.href;
				queryParams = api.utils.parseQueryString( urlParser.search.substr( 1 ) );

				component.updatePreviewUrl( queryParams );
				// if ( ! _.isUndefined( state.historyPosition ) ) {
				// 	component.historyPosition = state.historyPosition;
				// }

				// Make sure the current changeset_uuid is in the URL.
				if ( queryParams.changeset_uuid !== api.settings.changeset.uuid ) {
					queryParams.changeset_uuid = api.settings.changeset.uuid;
					urlParser.search = $.param( queryParams ).replace( /%5B/g, '[' ).replace( /%5D/g, ']' ).replace( /%2F/g, '/' ).replace( /%3A/g, ':' );
					history.replaceState( {}, '', urlParser.href );
				}
			} );
		} else {
			component.parentMessenger.bind( 'history-change', function ( data ) {
				console.info( 'OVERRIDE', component.previousQueryParams.url, 'to', data.queryParams.url );
				component.previousQueryParams.url = data.queryParams.url; // Prevent pushState from happening.
				component.updatePreviewUrl( data.queryParams || {} );
				// if ( ! _.isUndefined( data.historyPosition ) ) {
				// 	component.historyPosition = data.historyPosition;
				// }
			} );
		}

		component.expandedPanel.set( api.settings.autofocus.panel || '' );
		component.expandedSection.set( api.settings.autofocus.section || '' );
		component.expandedControl.set( api.settings.autofocus.control || '' );

		api.control.each( component.watchExpandedChange );
		api.section.each( component.watchExpandedChange );
		api.panel.each( component.watchExpandedChange );

		api.control.bind( 'add', component.watchExpandedChange );
		api.section.bind( 'add', component.watchExpandedChange );
		api.panel.bind( 'add', component.watchExpandedChange );

		api.control.bind( 'remove', component.unwatchExpandedChange );
		api.section.bind( 'remove', component.unwatchExpandedChange );
		api.panel.bind( 'remove', component.unwatchExpandedChange );

		api.previewedDevice.bind( component.updateWindowLocation );
		api.previewer.previewUrl.bind( component.updateWindowLocation );
		api.previewer.bind( 'scroll', component.updateWindowLocation );
		component.previewScrollPosition.bind( component.updateWindowLocation );
		api.state( 'saved' ).bind( component.updateWindowLocation );

		component.updateWindowLocation();
	};

	api.bind( 'ready', function onCustomizeReady() {

		// Short-circuit if not supported.
		if ( ! history.replaceState || ! history.pushState ) {
			return;
		}

		component.parentMessenger = new api.Messenger({
			url: api.settings.url.parent,
			channel: 'loader'
		});

		/*
		 * Start syncing state once the preview loads so that the active panels/sections/controls
		 * have been set to prevent the URL from being momentarily having autofocus params removed.
		 */
		api.previewer.deferred.active.done( component.startUpdatingWindowLocation );
	} );

	return component;

})( wp.customize, jQuery );
