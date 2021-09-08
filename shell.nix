with import <nixpkgs> {};
stdenv.mkDerivation rec {
  name = "tinyseq-tracker";

  # needed by node-gyp
  PYTHON = "${pkgs.python2}/bin/python";

  env = buildEnv { name = name; paths = buildInputs; };
  buildInputs = [
    nodejs-10_x
    yarn
    pkg-config
    cairo
  ];
}
