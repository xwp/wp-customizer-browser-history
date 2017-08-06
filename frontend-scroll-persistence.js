/* global _ */
/* eslint no-magic-numbers: ["error", { "ignore": [0,1] }] */
/* exported CustomizerBrowserHistoryFrontendScrollPersistence */

var CustomizerBrowserHistoryFrontendScrollPersistence = (function( $ ) {
	'use strict';

	var component = {};

	/**
	 * Update scroll param.
	 *
	 * @returns {void}
	 */
	component.updateScrollParam = function updateScrollParam() {
		var query = $( this ).prop( 'search' ).substr( 1 );

		// Remove existing scroll param.
		query = _.filter( query.split( /&/ ), function( pair ) {
			return ! /^scroll=/.test( pair );
		}).join( '&' );

		// Append new scroll param to query string.
		if ( query.length > 0 ) {
			query += '&';
		}
		query += 'scroll=' + String( $( window ).scrollTop() );

		// Update query string.
		$( this ).prop( 'search', query );
	};

	/**
	 * Restore the scroll position the user was last at in the Customizer preview.
	 *
	 * @returns {void}
	 */
	component.restoreScrollPosition = function restoreScrollPosition() {
		if ( 'undefined' !== typeof sessionStorage && sessionStorage.getItem( 'lastCustomizerScrollPosition' ) ) {
			$( window ).scrollTop( parseInt( sessionStorage.getItem( 'lastCustomizerScrollPosition' ), 10 ) );
			sessionStorage.removeItem( 'lastCustomizerScrollPosition' );
		}
	};

	/**
	 * Set up functionality.
	 *
	 * @returns {void}
	 */
	component.ready = function ready() {
		component.restoreScrollPosition();

		$( '#wp-admin-bar-customize > a' ).on( 'mouseover mousedown click', component.updateScrollParam );
	};

	/**
	 * Initialize.
	 *
	 * @returns {void}
	 */
	component.init = function init() {
		$( component.ready );
	};

	return component;
})( jQuery );

