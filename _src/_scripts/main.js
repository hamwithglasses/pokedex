(function(window, document, $, undefined) {
	'use strict';

	$(document).on('ready', function(e) {
		var x = 0;
		var y = 0;
		var top = window.pageYOffset || document.documentElement.scrollTop;

		var $hover = $('.js-hover');

		$('body').on('mousemove', function(e){
			x = e.clientX;
			y = e.clientY;
			top = window.pageYOffset || document.documentElement.scrollTop;

			$hover.css('top', y + top);
			$hover.css('left', x);
		});

		$('.js-pokemon').on('mouseover', function(e){
			var $that = $(this);
			var name = $that.attr('data-name');
			var id = $that.attr('data-id');

			$hover.attr('data-state', 'on');

			$('.js-hover-name').html('<strong>' + id + '</strong> ' + name);
			$('.js-hover-sprite').css('background-image', 'url("/assets/img/sprite/' + id + 'MS.png")');
		});
		$('.js-pokemon').on('mouseout', function(e){
			$hover.attr('data-state', 'off');
		});
	});

})(window, document, jQuery);
