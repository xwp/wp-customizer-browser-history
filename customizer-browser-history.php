<?php
/**
 * Plugin Name: Customizer Browser History
 * Version: 0.4.7
 * Description: Keep Customizer URL updated with current previewed URL as url param and current expanded panel/section/control as autofocus param. This allows for bookmarking and also the ability to reload and return go the same view. This is a feature plugin for <a href="https://core.trac.wordpress.org/ticket/28536">#28536</a> and it works best with the <a href="https://github.com/xwp/wp-customize-snapshots">Customize Snapshots</a> plugin.
 * Plugin URI: https://github.com/xwp/wp-customizer-browser-history
 * Author: Weston Ruter
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

/**
 * Register and enqueue customizer scripts.
 */
function customizer_browser_history_enqueue_scripts() {
	$handle = 'customizer-browser-history';
	$src = plugin_dir_url( __FILE__ ) . '/customizer-browser-history.js';
	$deps = array( 'customize-controls' );
	$ver = false;
	wp_enqueue_script( $handle, $src, $deps, $ver );
}
add_action( 'customize_controls_enqueue_scripts', 'customizer_browser_history_enqueue_scripts' );

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
