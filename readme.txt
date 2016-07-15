=== Customizer Browser History ===
Contributors:      xwp, westonruter
Tags:              customizer, customize
Requires at least: 4.5
Tested up to:      4.6-beta2
License:           GPLv2 or later
License URI:       http://www.gnu.org/licenses/gpl-2.0.html

Sync browser URL in Customizer with current preview URL and focused panels, sections, and controls.

== Description ==

*This is a feature plugin intended to implement [#28536](https://core.trac.wordpress.org/ticket/28536): Add browser history and deep linking for navigation in Customizer preview*

This plugin keeps the Customizer URL in the browser updated with current previewed URL as the `url` query param and current expanded panel/section/control as `autofocus` params. This allows for bookmarking and also the ability to reload and return go the same view (which is great for developers). This works best with the <a href="https://github.com/xwp/wp-customize-snapshots">Customize Snapshots</a> plugin, which allows allows you to save your Customizer state in a shapshot/changeset with an associated UUID that also gets added to the browser URL in the Customizer.

**Development of this plugin is done [on GitHub](https://github.com/xwp/wp-customizer-browser-history). Pull requests welcome. Please see [issues](https://github.com/xwp/wp-customizer-browser-history/issues) reported there before going to the [plugin forum](https://wordpress.org/support/plugin/customizer-browser-history).**

== Changelog ==

= 0.1.0 =

Initial release.
