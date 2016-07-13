/* global wp */
/* exported CustomizerBookmarking */
/* eslint no-magic-numbers: ["error", { "ignore": [0,1,2] }] */
/* eslint complexity: ["error", 5] */

var CustomizerBookmarking = (function( api ) {
	'use strict';

	var component = {
		expandedPanel: new api.Value(),
		expandedSection: new api.Value(),
		expandedControl: new api.Value()
	};

	/**
	 * Update the URL state with the current Customizer state.
	 *
	 * @returns {void}
	 */
	component.replaceState = _.debounce( function() {
		var expandedPanel = '', expandedSection = '', expandedControl = '', values, urlParser, oldQueryParams, newQueryParams, queryString;

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
		api.control.each( function( control ) {
			if ( expandedSection && control.active() && control.expanded && control.expanded() ) {
				expandedControl = control.id;
			}
		} );

		component.expandedPanel.set( expandedPanel );
		component.expandedSection.set( expandedSection );
		component.expandedControl.set( expandedControl );

		urlParser = document.createElement( 'a' );
		urlParser.href = location.href;
		oldQueryParams = {};
		queryString = urlParser.search.substr( 1 );
		if ( queryString ) {
			_.each( queryString.split( '&' ), function( pair ) {
				var parts = pair.split( '=', 2 );
				if ( parts[0] && parts[1] ) {
					oldQueryParams[ decodeURIComponent( parts[0] ) ] = decodeURIComponent( parts[1] );
				}
			} );
		}

		newQueryParams = {};
		values = {
			url: api.previewer.previewUrl,
			'autofocus[panel]': component.expandedPanel,
			'autofocus[section]': component.expandedSection,
			'autofocus[control]': component.expandedControl
		};
		_.each( values, function( valueObj, key ) {
			var value = valueObj.get();
			if ( value ) {
				newQueryParams[ key ] = value;
			}
		} );

		if ( ! _.isEqual( newQueryParams, oldQueryParams ) ) {
			urlParser.search = _.map( newQueryParams, function( value, key ) {
				return (
					encodeURIComponent( key ) + '=' + encodeURIComponent( value )
				).replace( /%5B/g, '[' ).replace( /%5D/g, ']' );
			} ).join( '&' );

			history.replaceState( {}, document.title, urlParser.href );
		}
	} );

	/**
	 * Watch for changes to a construct's active and expanded states.
	 *
	 * @param {wp.customize.Panel|wp.customize.Section|wp.customize.Control} construct Construct.
	 * @returns {void}
	 */
	component.watchExpandedChange = function watchExpandedChange( construct ) {
		if ( construct.active ) {
			construct.active.bind( component.replaceState );
		}
		if ( construct.expanded ) {
			construct.expanded.bind( component.replaceState );
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
			construct.active.unbind( component.replaceState );
		}
		if ( construct.expanded ) {
			construct.expanded.unbind( component.replaceState );
		}
	};

	api.bind( 'ready', function() {

		// Short-circuit if not supported.
		if ( ! history.replaceState ) {
			return;
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

		api.control.bind( 'remove', component.watchExpandedChange );
		api.section.bind( 'remove', component.watchExpandedChange );
		api.panel.bind( 'remove', component.watchExpandedChange );

		api.previewer.previewUrl.bind( component.replaceState );
	} );

	return component;

})( wp.customize );
