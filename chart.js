var div = document.getElementById('chart');
var canvas = document.createElement('canvas');
div.appendChild(canvas);
var comp_styles = window.getComputedStyle(div);
var w = Number(comp_styles.getPropertyValue('width').replace('px', ''));
var h = Number(comp_styles.getPropertyValue('height').replace('px', ''));
canvas.setAttribute('width', w);
canvas.setAttribute('height', h);

w = new Fraction(w);
h = new Fraction(h);

var one = new Fraction(1);
var two = new Fraction(2);
var s_in = new Fraction(0.1)
var s_out = two.sub(s_in);
var zero = new Fraction(0);
var fh = h.mul(0.8);
var fo = h.mul(0.1);
var dot = h.mul(0.01);
var line = h.mul(0.006);

var ctx = canvas.getContext('2d');

//
// - = 1 time-unit  by x axis
// | = 5 price-unit by y axis
// view port width 100% cover 20 time-unit by x axis
//                                                     (55,35)
//                                                       *-----------------------
//                                                       |
//                          (28,20)                      |
//          (10,15)           *----------------          |
//----------*------           |               |          |
//                |           |               |          |
//                |           |               |          |
//                *---------  |               *-----------
//            (16,5)       |  |             (44,5)
//                   (25,0)*---
//
//<-------w = 20 ------>     <-------w = 20 ------>
//
//
//frame 1:
//
//          (10,15)
//----------*------
//                |
//                |
//                *-----
//            (16,5)
//
//                           27      frame       47
//                           <-------w = 20 ------>
//
//
//
//
//                          (28,20)
//                            *----------------
//                            |               |
//                            |               |
//                            |               |
//                            |               *----
//                            |             (44,5)
//                        *  --
//                        ^
//                        |
//                 prev dot for norm

//var points = Array(50000).fill('').map((_, i) => Object({time: 10 * (1 + i) , price: Math.floor(1500 * Math.random())}));

var points = [//Array(10000).fill('').map((_, i) => Object({time: (10 * (i + 1)) + Math.floor(10 * Math.random()), price: 15 * Math.random()}));
    {time: 10000, price: 15},
    {time: 16000, price: 5},
    {time: 25000, price: 0},
    {time: 28000, price: 20},
    {time: 44000, price: 5},
    {time: 55000, price: 35}
];

points.forEach(p => {
    p.time = new Fraction(p.time);
    p.price = new Fraction(p.price);
})

var dt = new Fraction(1000);//ms
var period_parts = new Fraction(20);
var t_period = period_parts.mul(dt);//ms
var t_start = new Fraction(1000);
var frame = {
    t0         : t_start,
    tn         : t_start.add(t_period),
    min        : new Fraction(5),//points.reduce((acc, p) => {p.price}, Infinity),
    max        : new Fraction(15),//points.reduce((acc, p) => {p.price}, -Infinity),
    norm       : new Fraction(10),
    index_first: 0,
    index_last : 1
};
var norm_cache = [];//2x2 matrix; row is first index; column is last index; value is
//update_min_max(frame);
render(frame)

//var frames = [];

//frames[frame.t0] = Array(period);
//frames[frame.t0][frame.tn] = frame;

//update_min() & update_max() could be speedup by pre-sort

function update_min (frame) {
    norm_cache[frame.index_first] = norm_cache[frame.index_first] || [];
    if (norm_cache[frame.index_first][frame.index_last]) {
        frame.norm = norm_cache[frame.index_first][frame.index_last];
        return
    }
    frame.min = points[frame.index_first - 1]
        ? points[frame.index_first - 1].price
        : points[frame.index_first].price;
    for (var i = frame.index_first - 1; i <= frame.index_last; i++)
        if (points[i] && points[i].price.compare(frame.min) < 0) frame.min = points[i].price

    frame.norm = frame.min < frame.max
        ? frame.max.sub(frame.min)
        : frame.min.sub(frame.max);

    norm_cache[frame.index_first][frame.last_first] = frame.norm;
}

function update_max (frame) {
    norm_cache[frame.index_first] = norm_cache[frame.index_first] || [];
    if (norm_cache[frame.index_first][frame.index_last]) {
        frame.norm = norm_cache[frame.index_first][frame.last_first];
        return
    }
    frame.max = points[frame.index_first - 1]
        ? points[frame.index_first - 1].price
        : points[frame.index_first].price;
    for (var i = frame.index_first - 1; i <= frame.index_last; i++)
        if (points[i] && points[i].price.compare(frame.max) > 0) frame.max = points[i].price

    frame.norm = frame.min.compare(frame.max) < 0
        ? frame.max.sub(frame.min)
        : frame.min.sub(frame.max);
    norm_cache[frame.index_first][frame.last_first] = frame.norm;
}

function update_min_max (frame) {
    norm_cache[frame.index_first] = norm_cache[frame.index_first] || [];
    if (norm_cache[frame.index_first][frame.index_last]) {
        frame.norm = norm_cache[frame.index_first][frame.last_first];
        return
    }
    frame.max = frame.min = points[frame.index_first - 1]
        ? points[frame.index_first - 1].price
        : points[frame.index_first].price;
    if (frame.index_first === 0) return
    for (var i = frame.index_first - 1; i <= frame.index_last; i++) {
        if (points[i].price.compare(frame.max) > 0) frame.max = points[i].price
        if (points[i].price.compare(frame.min) < 0) frame.min = points[i].price
    }
    frame.norm = frame.min.compare(frame.max) < 0
        ? frame.max.sub(frame.min)
        : frame.min.sub(frame.max);
    norm_cache[frame.index_first][frame.last_first] = frame.norm;
}

function create_frame_left (prev_frame, t0, tn) {
    var frame = {};
    var should_update_min = false;
    var should_update_max = false;

    frame.t0   = t0;
    frame.tn   = tn;
    frame.min  = prev_frame.min;
    frame.max  = prev_frame.max;
    frame.norm = prev_frame.norm;
    frame.index_first = prev_frame.index_first;
    frame.index_last = prev_frame.index_last;

    var point;

    point = points[frame.index_first - 1];

    while (point && point.time.compare(frame.t0) >= 0) {// collect_new_points_by_until_rich_left_border_frame
        if      (point.price.compare(frame.min) < 0) {
            frame.norm = frame.norm.add(frame.min.sub(point.price));
            frame.min = point.price;
        }
        else if (point.price.compare(frame.max) > 0) {
            frame.norm = frame.norm.add(point.price.sub(frame.max));
            frame.max = point.price;
        }
        frame.index_first--;
        point = points[frame.index_first - 1];
    }

    point = points[frame.index_last];

    while (point && point.time.compare(frame.tn) > 0) {// remove_points_witch_gone_from_right_border_frame
        if (point.price.compare(frame.min) === 0) should_update_min = true;
        if (point.price.compare(frame.max) === 0) should_update_max = true;
        frame.index_last--;
        point = points[frame.index_last];
    }

    if (should_update_min) {
        if (should_update_max) update_min_max(frame)
        else update_min(frame)
    } else if (should_update_max) update_max(frame)

    return frame
}

function create_frame_right (prev_frame, t0, tn) {
    var frame = {};
    var should_update_min = false;
    var should_update_max = false;

    frame.t0          = t0;
    frame.tn          = tn;
    frame.min         = prev_frame.min;
    frame.max         = prev_frame.max;
    frame.norm        = prev_frame.norm;
    frame.index_first = prev_frame.index_first;
    frame.index_last  = prev_frame.index_last;

    var point;

    point = points[frame.index_last + 1];

    while (point && point.time.compare(frame.tn) <= 0) {// collect_new_points_by_until_rich_right_border_frame
        if      (point.price.compare(frame.min) < 0) {
            frame.norm = frame.norm.add(frame.min.sub(point.price));
            frame.min  = point.price;
        }
        else if (point.price.compare(frame.max) > 0) {
            frame.norm = frame.norm.add(point.price.sub(frame.max));
            frame.max  = point.price;
        }
        frame.index_last++;
        point = points[frame.index_last + 1];
    }

    point = points[frame.index_first - 1];//prev out of frame left point
    if (point) {
        if (point.price.compare(frame.min) === 0) should_update_min = true;
        if (point.price.compare(frame.max) === 0) should_update_max = true;
    }

    point = points[frame.index_first];

    while (point && point.time < frame.t0) {// remove_points_witch_gone_from_left_border_frame
        if (point.price.compare(frame.min) === 0) should_update_min = true;
        if (point.price.compare(frame.max) === 0) should_update_max = true;
        frame.index_first++;
        point = points[frame.index_first];
    }

    if (should_update_min) {
        if (should_update_max) update_min_max(frame)
        else update_min(frame)
    } else if (should_update_max) update_max(frame)

    return frame
}

function create_frame_in (prev_frame, t0, tn) {
    var frame = {};
    var should_update_min = false;
    var should_update_max = false;

    frame.t0          = t0;
    frame.tn          = tn;
    frame.min         = prev_frame.min;
    frame.max         = prev_frame.max;
    frame.norm        = prev_frame.norm;
    frame.index_first = prev_frame.index_first;
    frame.index_last  = prev_frame.index_last;

    var point;

    point = points[frame.index_last];

    while (point && point.time.compare(frame.tn) > 0) {// remove_points_witch_gone_from_right_border_frame
        if (point.price.compare(frame.min) === 0) should_update_min = true;
        if (point.price.compare(frame.max) === 0) should_update_max = true;
        frame.index_last--;
        point = points[frame.index_last];
    }

    point = points[frame.index_first - 1];//prev out of frame left point
    if (point) {
        if (point.price.compare(frame.min) === 0) should_update_min = true;
        if (point.price.compare(frame.max) === 0) should_update_max = true;
    }

    point = points[frame.index_first];

    while (point && point.time < frame.t0) {// remove_points_witch_gone_from_left_border_frame
        if (point.price.compare(frame.min) === 0) should_update_min = true;
        if (point.price.compare(frame.max) === 0) should_update_max = true;
        frame.index_first++;
        point = points[frame.index_first];
    }

    if (should_update_min) {
        if (should_update_max) update_min_max(frame)
        else update_min(frame)
    } else if (should_update_max) update_max(frame)

    return frame
}


function test_min_max(frame) {
    var price;
    var norm;
    var start_from_index = points[frame.index_first - 1] === undefined
        ? frame.index_first
        : frame.index_first - 1;
    var min = points[start_from_index].price;
    var max = points[start_from_index].price;
    for (var i = start_from_index; i <= frame.index_last; i++) {
        price = points[i].price;
        if (price.compare(min) < 0) min = price;
        if (price.compare(max) > 0) max = price;
    }
    norm = max.compare(min) > 0
        ? max.sub(min)
        : min.sub(max);
    if ( min.compare(frame.min)  !== 0 ) {console.log('error'); debugger;}
    if ( max.compare(frame.max)  !== 0)  {console.log('error'); debugger;}
    if (norm.compare(frame.norm) !== 0)  {console.log('error'); debugger;}
    norm = frame.max.compare(frame.min) > 0
        ? frame.max.sub(frame.min)
        : frame.min.sub(frame.max);
    if (norm.compare(frame.norm) !== 0) {console.log('error'); debugger;}
}

function render_frame (frame) {
    var s = [];
    test_min_max(frame);
    for (var i = frame.index_first; i <= frame.index_last; i++) {
        s.push(points[i]);
    }
    console.log(frame);
    console.log('Frame:', frame.t0, frame.tn);
    console.table(s);
}

function debug_graphics(g) {
        //left top corner
        g.lineStyle(0);
        g.beginFill(0x00FF00, 0.5);
        g.drawCircle(0, 0, dot);
        g.endFill();
        //right bottom corner
        g.lineStyle(0);
        g.beginFill(0x00FF00, 0.5);
        g.drawCircle(w, h, dot);
        g.endFill();
        //right top corner
        g.lineStyle(0);
        g.beginFill(0x00FF00, 0.5);
        g.drawCircle(w, 0, dot);
        g.endFill();
        //left bottom corner
        g.lineStyle(0);
        g.beginFill(0x00FF00, 0.5);
        g.drawCircle(0, h, dot);
        g.endFill();

    //offsets for debug
    g.lineStyle(1, 0xFF0000, 1);
    g.moveTo(0, fo);
    g.lineTo(w, fo);
    g.moveTo(0, h - fo);
    g.lineTo(w, h - fo);
}

function render (frame) {

    test_min_max(frame);

    return frame.norm.equals(0)
        ? render_one_center_line(frame)
        : render_wWw(frame)
}

window['2PI'] = 2 * Math.PI;

function render_one_center_line (frame) {
    var y = fo.add(fh.mul(0.5)).valueOf();
    var x = 0;
    ctx.clearRect(0, 0, w.valueOf(), h.valueOf());
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(w.valueOf(), y);
    for (var i = frame.index_first; i <= frame.index_last; i++) {
        var {time} = points[i];
        var cx = w.mul(time.sub(frame.t0).div(t_period)).valueOf();
        var cy = y;
        ctx.arc(cx, cy, dot.valueOf(), 0, window['2PI']);
    }

}

function render_wWw (frame) {
    var
        price = points[frame.index_first - 1] === undefined
            ? points[frame.index_first].price
            : points[frame.index_first - 1].price,
        y = fo.add(
            fh.mul(
                one.sub(
                    price.sub(frame.min).div(frame.norm)
                )
            )
        ).valueOf();
        x = 0;
    ctx.clearRect(0, 0, w.valueOf(), h.valueOf());
    ctx.beginPath();
    ctx.moveTo(x, y);

    for (var i = frame.index_first; i <= frame.index_last; i++) {
        var {time, price} = points[i];
        x = w.mul(time.sub(frame.t0).div(t_period)).valueOf();
        ctx.lineTo(x, y);
        y = fo.add(fh.mul(one.sub(price.sub(frame.min).div(frame.norm))));
        ctx.lineTo(x.valueOf(), y.valueOf());
    }
    ctx.lineTo(w.valueOf(), y.valueOf());


    ctx.stroke();

    //debug_graphics(ctx);
}

var t  = t_start;
var tz = t_start.add(t_period);

var scale = false;
var m;

var action = {
    zoom_in: m => {
        m = new Fraction(m);
        t  = t.add(one.sub(s_in).mul(t_period).mul(m).div(w))
        t_period = t_period.mul(s_in)
        dt = dt.mul(s_in)
        tz = t.add(t_period)
    },
    left: () => {
        t = t.sub(dt)
        tz = tz.sub(dt)
    },
    zoom_out: m => {
        m = new Fraction(m);
        t  = t.add(one.sub(s_out).mul(t_period).mul(m).div(w))
        t_period = t_period.mul(s_out)
        dt = dt.mul(s_out)
        tz = t.add(t_period)
    },
    right: () => {
        t = t.add(dt)
        tz = tz.add(dt)
    }
}
div.onwheel = e =>
    e.deltaY > 0
        ? e.shiftKey
            ? action.zoom_in(e.offsetX)
            : action.left()
        : e.shiftKey
            ? action.zoom_out(e.offsetX)
            : action.right()

function zoom_in (t0, tn) {
    frame = create_frame_in(frame, t0, tn);
    render(frame)
    window.requestAnimationFrame(next)
}

function zoom_out (t0, tn) {
    alert(3)
    return;
    //ERROR only for debug
    frame = create_frame_out(frame, t0, tn);
    render(frame)
    window.requestAnimationFrame(next)
}

function left (t0, tn) {
    frame = create_frame_left(frame, t0, tn);
    render(frame)
    window.requestAnimationFrame(next)
}

function right (t0, tn) {
    frame = create_frame_right(frame, t0, tn);
    render(frame)
    window.requestAnimationFrame(next)
}

function next () {
    if (t.compare(frame.t0) < 0)
        if  (tz.compare(frame.tn) > 0)
            zoom_in(t, tz)//zoom_out ERROR
        else
            left (t, tz)
    else if (t.compare(frame.t0) > 0)
        if (tz.compare(frame.tn) < 0)
            zoom_in(t, tz)
        else
            right(t, tz)
    else window.requestAnimationFrame(next)
}

window.requestAnimationFrame(next)
