<?php
/**
 * Plugin Name: Customizer Browser History
 * Version: 0.5.2
 * Description: Keep Customizer URL updated with current previewed URL as url param and current expanded panel/section/control as autofocus param. This allows for bookmarking and also the ability to reload and return go the same view. This is a feature plugin for <a href="https://core.trac.wordpress.org/ticket/28536">#28536</a> and it works best with the <a href="https://github.com/xwp/wp-customize-snapshots">Customize Snapshots</a> plugin.
 * Plugin URI: https://github.com/xwp/wp-customizer-browser-history
 * Author: Weston Ruter, XWP
 * Author URI: https://make.xwp.co/
 * Domain Path: /languages
 *
 * Copyright (c) 2016 XWP (https://make.xwp.co/)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 * @package CustomizerBrowserHistory
 */

define( 'CUSTOMIZER_BROWSER_HISTORY_VERSION', '0.5.2' );

/**
 * Register and enqueue customizer controls scripts.
 */
function customizer_browser_history_enqueue_controls_scripts() {
	$handle = 'customizer-browser-history-customize-controls';
	$src = plugin_dir_url( __FILE__ ) . 'customize-controls.js';
	$deps = array( 'customize-controls' );
	$ver = CUSTOMIZER_BROWSER_HISTORY_VERSION;
	wp_enqueue_script( $handle, $src, $deps, $ver );

	wp_add_inline_script( $handle, 'CustomizerBrowserHistory.init();' );
}
add_action( 'customize_controls_enqueue_scripts', 'customizer_browser_history_enqueue_controls_scripts' );

/**
 * Register and enqueue non-preview frontend scripts.
 */
function customizer_browser_history_enqueue_frontend_scripts() {
	if ( ! is_user_logged_in() || ! is_admin_bar_showing() || ! current_user_can( 'customize' ) ) {
		return;
	}

	$handle = '/customizer-browser-history-frontend-scroll-persistence';
	$src = plugin_dir_url( __FILE__ ) . 'frontend-scroll-persistence.js';
	$deps = array( 'jquery', 'underscore' );
	$ver = CUSTOMIZER_BROWSER_HISTORY_VERSION;
	wp_enqueue_script( $handle, $src, $deps, $ver );

	wp_add_inline_script( $handle, 'CustomizerBrowserHistoryFrontendScrollPersistence.init();' );
}
add_action( 'wp_enqueue_scripts', 'customizer_browser_history_enqueue_frontend_scripts' );

/**
 * Filter the available devices to change default based on device query param.
 *
 * @see WP_Customize_Manager::get_previewable_devices()
 * @param array $devices List of devices with labels and default setting.
 * @return array Devices.
 */
function customizer_browser_history_filter_default_previewable_devices( $devices ) {
	if ( ! isset( $_GET['device'] ) ) {
		return $devices;
	}
	$device_name = wp_unslash( $_GET['device'] );
	if ( ! isset( $devices[ $device_name ] ) ) {
		return $devices;
	}
	foreach ( $devices as &$device ) {
		unset( $device['default'] );
	}
	$devices[ $device_name ]['default'] = true;
	return $devices;
}
add_filter( 'customize_previewable_devices', 'customizer_browser_history_filter_default_previewable_devices' );
