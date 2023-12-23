{ pkgs }: {
  deps = [
    pkgs.gmp
    pkgs.rustc
    pkgs.libiconv
    pkgs.cargo
    pkgs.zlib
    pkgs.tk
    pkgs.tcl
    pkgs.openjpeg
    pkgs.libxcrypt
    pkgs.libwebp
    pkgs.libtiff
    pkgs.libjpeg
    pkgs.libimagequant
    pkgs.lcms2
    pkgs.freetype
	pkgs.sqlite
	pkgs.mosquitto
	pkgs.nano
	pkgs.go
  ];
  env = {
    PYTHON_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.gmp
      pkgs.rustc
      pkgs.zlib
      pkgs.tk
      pkgs.tcl
      pkgs.openjpeg
      pkgs.libxcrypt
      pkgs.libwebp
      pkgs.libimagequant
      pkgs.freetype
    ];
  };
}