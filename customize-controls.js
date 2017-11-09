/* global wp */
/* exported CustomizerBrowserHistory */
/* eslint no-magic-numbers: ["error", { "ignore": [-1,0,1,2,10] }] */
/* eslint complexity: ["error", 8] */

var CustomizerBrowserHistory = (function( api, $ ) {
	'use strict';

	var component = {
		defaultQueryParamValues: {},
		previousQueryParams: {},
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
		queryParams = {};

		queryString = urlParser.search.substr( 1 );
		if ( queryString ) {
			queryParams = api.utils.parseQueryString( queryString );
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
		var expandedPanel = '', expandedSection = '', expandedControl = '', values, urlParser, oldQueryParams, newQueryParams, setQueryParams, urlChanged = false;

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

		oldQueryParams = component.getQueryParams( location.href );
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

		/*
		 * There can only be one. Well, there should be. Let presence control override section,
		 * and section override panel. But if something was not registered in PHP, then include
		 * the autofocus parameter for its parent as it is likely lazy-loaded upon parent expanded.
		 */
		if ( newQueryParams['autofocus[section]'] && ! _.isUndefined( api.settings.sections[ newQueryParams['autofocus[section]'] ] ) ) {
			delete newQueryParams['autofocus[panel]'];
		}
		if ( newQueryParams['autofocus[control]'] && ! _.isUndefined( api.settings.sections[ newQueryParams['autofocus[control]'] ] ) ) {
			delete newQueryParams['autofocus[section]'];
		}

		// Delete the section if its parent panel is not expanded.
		if (
			component.expandedSection.get() &&
			api.section.has( component.expandedSection.get() ) &&
			api.section( component.expandedSection.get() ).panel() &&
			api.panel.has( api.section( component.expandedSection.get() ).panel() ) &&
			! api.panel( api.section( component.expandedSection.get() ).panel() ).expanded()
		) {
			delete newQueryParams['autofocus[section]'];
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

			if ( newQueryParams.url !== ( oldQueryParams.url || component.defaultQueryParamValues.url ) ) {
				urlChanged = true;
			}

			// Send the state to the parent window.
			if ( urlChanged ) {
				history.pushState( {}, '', urlParser.href );
			} else {
				history.replaceState( {}, '', urlParser.href );
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
			api.previewer.send( 'scroll', component.previewScrollPosition.get() );
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
			'url': api.settings.url.home,
			'autofocus[panel]': '',
			'autofocus[section]': '',
			'autofocus[control]': ''
		};

		component.previousQueryParams = _.extend( {}, currentQueryParams );

		$( window ).on( 'popstate', function onPopState( event ) {
			var urlParser, queryParams;
			urlParser = document.createElement( 'a' );
			urlParser.href = location.href;
			queryParams = api.utils.parseQueryString( urlParser.search.substr( 1 ) );

			component.updatePreviewUrl( queryParams );

			// Make sure the current changeset_uuid is in the URL (if changesets are available).
			if ( api.settings.changeset && queryParams.changeset_uuid !== api.settings.changeset.uuid ) {
				queryParams.changeset_uuid = api.settings.changeset.uuid;
				urlParser.search = $.param( queryParams ).replace( /%5B/g, '[' ).replace( /%5D/g, ']' ).replace( /%2F/g, '/' ).replace( /%3A/g, ':' );
				history.replaceState( event.originalEvent.state, '', urlParser.href );
			}
		} );

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

		component.updateWindowLocation();
	};

	/**
	 * Set up functionality.
	 *
	 * @returns {void}
	 */
	component.ready = function ready() {
		var closeLink = $( '.customize-controls-close' ), rememberScrollPosition;

		// Short-circuit if not supported or if using customize-loader.
		if ( ! history.replaceState || ! history.pushState || top !== window ) {
			return;
		}

		rememberScrollPosition = function() {
			sessionStorage.setItem( 'lastCustomizerScrollPosition', api.previewer.scroll );
		};

		// Update close link URL to be preview URL and remember scoll position if close link is not back to WP Admin.
		if ( -1 === closeLink.prop( 'pathname' ).indexOf( '/wp-admin/' ) ) {

			// Sync the preview URL to the close button so the URL navigated to upon closing is the last URL which was previewed.
			api.previewer.previewUrl.bind( function( newPreviewUrl ) {
				var urlParser = document.createElement( 'a' );
				urlParser.href = newPreviewUrl;

				// Only copy the path and query vars since the frontend URL may have a different domain.
				closeLink.prop( 'pathname', urlParser.pathname );
				closeLink.prop( 'search', urlParser.search );
			});

			// Remember scroll position if we're going back to the frontend.
			closeLink.on( 'click', rememberScrollPosition );
		}

		/*
		 * Start syncing state once the preview loads so that the active panels/sections/controls
		 * have been set to prevent the URL from being momentarily having autofocus params removed.
		 */
		api.previewer.deferred.active.done( component.startUpdatingWindowLocation );
	};

	/**
	 * Initialize component.
	 *
	 * @returns {void}
	 */
	component.init = function init() {
		api.bind( 'ready', component.ready );
	};

	return component;
})( wp.customize, jQuery );
