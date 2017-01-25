=== Customizer Browser History ===
Contributors:      xwp, westonruter
Tags:              customizer, customize
Requires at least: 4.6.0
Tested up to:      4.7.1
Stable tag:        0.4.7
License:           GPLv2 or later
License URI:       http://www.gnu.org/licenses/gpl-2.0.html

Sync browser URL in Customizer with current preview URL and focused panels, sections, and controls.

== Description ==

*This is a feature plugin intended to implement [#28536](https://core.trac.wordpress.org/ticket/28536): Add browser history and deep linking for navigation in Customizer preview*

This plugin keeps the Customizer URL in the browser updated with current previewed URL as the `url` query param and current expanded panel/section/control as `autofocus` params. This allows for bookmarking and also the ability to reload and return go the same view (which is great for developers), including which device you are previewing (desktop, tablet, or mobile). Not only will the URL be kept in sync with the current customizer UI, but new browser history entries will be added as you navigate around the site in the preview (via `history.pushState()`), allowing you to use the back/forward buttons as you would normally when browsing the site outside the customizer. The scroll position for each previewed URL is tracked as well, so that when you navigate back/forward the scroll position will be restored, just as happens when browsing the site outside the customizer preview. Restoring the scroll position also works when reloading the customizer, as the position is persisted in a `scroll` query parameter: again, this is extremely useful during development.

This plugin complements well the <a href="https://github.com/xwp/wp-customize-snapshots">Customize Snapshots</a> plugin which allows you to save your Customizer state in a shapshot/changeset with an associated UUID that also gets added to the browser URL in the Customizer.

For example, if you load the Customizer and then click the “Site Identity” section, the URL will be replaced to add `autofocus[section]=title_tagline`.

If you navigate into the nav menus panel, open a menu section, and then expand a nav menu item control, then the URL will have these `autofocus` params added:

<pre>
autofocus[panel]=nav_menus&autofocus[section]=nav_menu[87]&autofocus[control]=nav_menu_item[5123]
</pre>

And while these changes to the `autofocus` params are being made in the browser's URL as the Customizer UI is interacted with, if you navigate to another page in the preview the `url` parameter will also be replaced to reflect the new preview URL.

Note that the `url` param will be URL-encoded. So a typical Customizer URL would get updated to look like:

<pre>
http://example.com/wp-admin/customize.php?url=http%3A%2F%2Fexample.com%2Fsample-page%2F&autofocus[panel]=widgets&autofocus[section]=sidebar-widgets-sidebar-1&autofocus[control]=widget_text[10]&device=mobile&scroll=200
</pre>

**Development of this plugin is done [on GitHub](https://github.com/xwp/wp-customizer-browser-history). Pull requests welcome. Please see [issues](https://github.com/xwp/wp-customizer-browser-history/issues) reported there before going to the [plugin forum](https://wordpress.org/support/plugin/customizer-browser-history).**

== Changelog ==

= 0.4.7 =

Prevent dropping non-home initial `url` param when loading customizer. See [#19](https://github.com/xwp/wp-customizer-browser-history/pull/19).

= 0.4.6 =

Fix compatibility with WordPress 4.6. See [#17](https://github.com/xwp/wp-customizer-browser-history/pull/17).

= 0.4.5 =

Ensure `changeset_uuid` param is added to `customize.php` URL if state is dirty OR the changeset post exists. PR [#16](https://github.com/xwp/wp-customizer-browser-history/pull/16).

= 0.4.4 =

Only include one `autofocus` param. If `autofocus[control]` is present, skip including `autofocus[section]` (since implied). Likewise, if `autofocus[section]` is present, also exclude its containing `autofocus[panel]` since it is also implied. By only including one `autofocus` param the URL bar is less cluttered, but also an issue is fixed where focus may not reliably be added due to apparent inconsistencies in which construct is autofocused first (the control should really be the last to get focus).

= 0.4.3 =

Send scroll message to previewer to fix 4.7 scroll position.

= 0.4.2 =

Misc cleanup and improve integration with WP 4.7.

= 0.4.1 =

Fixed issue whereby an expanded widget control could persist its `autofocus` param when another section is expanded.

= 0.4.0 =

* Added persistence of `scroll` position when navigating back/forward in the preview and when reloading the customizer.
* Renamed the `customize_previewed_device` query param to just `device`.
* Improved the building of the URL query params to omit any params that are the same as the defaults, so `device=desktop` and `scroll=0` should not be shown, nor should a `url` that points to the home URL.
* Fixed dropping of value-less query params, e.g. `customize.php?debug`

= 0.3.0 =

* Add back/forward browser history for navigation in the Customizer preview. See [#2](https://github.com/xwp/wp-customizer-browser-history/issues/2), PR [#8](https://github.com/xwp/wp-customizer-browser-history/pull/8).
* Eliminate initial insertion of `url` and `customize_previewed_device` params when same as default.

= 0.2.0 =

Persist the device being previewed (desktop, tablet, mobile) in the URL via a new `customize_previewed_device` query param. See [#3](https://github.com/xwp/wp-customizer-browser-history/issues/3).

= 0.1.1 =

Remove `autofocus[control]` when there is not a section expanded, such as when a widget is expanded when the sidebar section is collapsed.

= 0.1.0 =

Initial release.
