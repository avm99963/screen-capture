.PHONY: all chromium-stable chromium-beta test-extension

all: chromium-stable chromium-beta

chromium-stable:
	bash release.bash -c stable -b chromium

chromium-beta:
	bash release.bash -c beta -b chromium

test-extension:
	bash generateManifest.bash "chromium"

clean:
	rm -rf out
