# FoodBao Modal Standardization Guide

This guide explains how to implement the standardized 95% frame size for all modals in the FoodBao application.

## Overview

The standardized modal implementation ensures that all modals in the FoodBao application:
- Use 95% of the viewport width and height
- Position 2.5% from the top (centered)
- Have consistent compact styling
- Use reduced padding and spacing
- Apply automatically regardless of how the modal is opened

## Implementation Options

### Option 1: Global Implementation (Recommended)

To apply standardized modal sizing across your entire application automatically, include the following files in your application:

1. Add the modal standardizer CSS and JS to your global template:

```html
<!-- In the <head> section of your base template or index.html -->
<link rel="stylesheet" href="css/modal-standardizer.css">
<script src="js/modal-standardizer.js" defer></script>
```

2. Or, use the global compact UI loader which already includes modal standardization:

```html
<!-- In the <head> section -->
<script src="js/global-compact-ui-loader.js"></script>
```

### Option 2: Page-by-Page Implementation

To apply the standardized modal sizing to specific pages only:

```html
<!-- In the <head> section of specific pages -->
<link rel="stylesheet" href="css/modal-standardizer.css">
<script src="js/modal-standardizer.js" defer></script>
```

### Option 3: On-Demand Implementation (Using Bookmarklet)

To apply the standardized modal sizing on-demand:

1. Create a bookmarklet with the following code:

```javascript
javascript:(function(){var s=document.createElement('script');s.src=window.location.origin+'/js/compact-ui-installer.js?v='+new Date().getTime();document.head.appendChild(s);})();
```

2. Click the bookmarklet on any FoodBao page to apply the compact UI including standardized modals.

## Custom Modal Classes

If you need different sizing for specific modals, use the following CSS classes:

- `.modal-small` - For small modals (400px width)
- `.modal-medium` - For medium modals (600px width)
- `.modal-large` - For large modals (95% width)
- `.modal-full` - For full-screen modals (98% width and height)

Example usage:

```html
<div id="mySmallModal" class="modal modal-small">
    <!-- Modal content -->
</div>
```

## Materialize Modal Initialization

When initializing Materialize modals, the standardization will be applied automatically. You don't need to set any special options:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems);
});
```

## Testing

To verify that modal standardization is working:

1. Open any page with a modal
2. Inspect the modal element
3. Check that it has the following styles:
   - width: 95%
   - height: 95%
   - top: 2.5%

## Troubleshooting

If modals are not standardized:

1. Check that modal-standardizer.css and modal-standardizer.js are correctly loaded
2. Verify there are no JavaScript errors in the console
3. Try applying the compact UI installer manually via console:

```javascript
var s = document.createElement('script');
s.src = '/js/compact-ui-installer.js';
document.head.appendChild(s);
```

For specific issues, check the console for messages from the standardizer.
