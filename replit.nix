{ pkgs }: {
  deps = [
	pkgs.sqlite
	pkgs.mosquitto
	pkgs.nano
	pkgs.go
  ];
}