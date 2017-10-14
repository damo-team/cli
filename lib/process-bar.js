var Cursor, ProgressBar, repeat;

Cursor = (function() {
  function Cursor(fd) {
    this.fd = fd;
    this.esc = "\u001b[";
    this.num_type = {
      left: "D",
      right: "C",
      up: "A",
      down: "B",
      delline: "M"
    };
    this.type = {
      hide: "?25l",
      end: "K",
      show: "?25h"
    };
  }

  Cursor.prototype.getChars = function(type, num) {
    if (this.num_type[type] !== undefined) {
      num = (num === undefined ? 1 : num * 1);
      return this.esc + num + this.num_type[type];
    } else {
      return this.esc + this.type[type];
    }
  };

  Cursor.prototype.left = function(num) {
    return this.write(this.getChars("left", num));
  };

  Cursor.prototype.up = function(num) {
    return this.write(this.getChars("up", num));
  };

  Cursor.prototype.delLine = function(num) {
    return this.write(this.getChars("delline", num));
  };

  Cursor.prototype.show = function() {
    return this.write(this.getChars("show"));
  };

  Cursor.prototype.home = function() {
    return this.left(process.stdout.columns);
  };

  Cursor.prototype.clearLine = function() {
    this.delLine();
    return this.home();
  };

  Cursor.prototype.write = function(chars) {
    return this.fd.write(chars);
  };

  return Cursor;

})();

repeat = function(str, num) {
  if (num * 1 <= 0) {
    return '';
  } else {
    return new Array(num * 1 + 1).join(str);
  }
};

ProgressBar = (function() {
  function ProgressBar() {
    this.isTTY = process.stderr.isTTY;
    if (!this.isTTY) {
      return;
    }
    this.total = 100;
    this.now = 0;
    this.cursor = new Cursor(process.stderr);
  }

  ProgressBar.prototype.onStart = function(total) {
    if (!this.isTTY) {
      return;
    }
    this.total = total;
    this.cursor.clearLine();
    return this.cursor.write(this.getLine());
  };

  ProgressBar.prototype.onChange = function(now) {
    if (!this.isTTY) {
      return;
    }
    this.now = now;
    this.cursor.up();
    this.cursor.clearLine();
    return this.cursor.write(this.getLine());
  };

  ProgressBar.prototype.onEnd = function() {
    if (!this.isTTY) {
      return;
    }
    this.onChange(this.total);
    return this.cursor.show();
  };

  ProgressBar.prototype.getLine = function() {
    var blank, left, line, used, width;
    line = "[";
    width = process.stderr.columns - 7;
    left = Math.floor(this.now / this.total * width);
    line += repeat("#", left);
    if (line.length <= width) {
      line += "+";
    }
    blank = width - left - 1;
    line += repeat(" ", blank > 0 ? blank : 0);
    line += "] ";
    used = Math.round(this.now / this.total * 100);
    line += used > 0 ? used : 0;
    line += "%\n";
    return line;
  };

  return ProgressBar;

})();

module.exports = function() {
  return new ProgressBar;
};
