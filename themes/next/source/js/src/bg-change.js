$(function(){
	if (!navigator.userAgent.match(/(iPhone|iPod|Android|ios)/i)) {
		$.getJSON('/images/bg/db.json', function(imgs) {
			//添加背景li元素
			var path = '/images/bg/';
			for (var i = 0; i < imgs.length; i++) {
				var $li = $('<li></li>');
				$li.appendTo($(".bgs"));
			}

			//顺序加载绑定事件
			var $images = [];
			for (var i = 0; i < imgs.length; i++) {
				$images[i] = ($("<img/>"));
				if (i === imgs.length - 1) break;
				(function(i){
					$images[i].load(function(){
						$images[i+1].attr("src", path + imgs[i+1]);
						$('.bgs li').eq(i+1).css('background-image', 'url(' + (path + imgs[i+1]) + ')');
						console.log(i+1+'张图开始加载了');
					})
				})(i);
			}

			//加载第一张
			$images[0].attr("src", path + imgs[0]);
			$('.bgs li').eq(0).show().css('background-image', 'url(' + (path + imgs[0]) + ')');
			$images[0].load(function(){
				bgChange();
			})
			
			//背景动画
			function bgChange() {
				$('.bgs li').eq(0).addClass('animation');
				$('.bgs li').eq(1).show();
				$('.bgs li').each(function(index,li){
					li.addEventListener("webkitAnimationEnd", function(){
						var $this = $(this);
						var $next = $this.next().length ? $this.next() : $('.bgs li').eq(0) ;
						var $afterNext = $next.next().length ? $next.next() : $('.bgs li').eq(0) ;
						$this.removeClass('animation').hide();
						$next.addClass('animation');
						$afterNext.show();
					});
				})
			}
		})
	}
})