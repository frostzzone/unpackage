$(document).ready(function() {
  var json
		//init code mirror
		var editor = CodeMirror(document.querySelector(".block-code"), {
			lineNumbers: true,
			autofocus: true,
			matchBrackets: true,
		    autoCloseBrackets: true,
		    mode: "application/ld+json",
		    lineWrapping: true,
		    indent: true
		});

		$(".clear").click(()=> {
			editor.setValue("");
		})

		$(".unpack").click(function() {

			let code = editor.getValue();
			if(code == '') {
				showMessage('error', 'Empty Json');
				return;
			}

			if(!IsValidJSONString(code)) {
				showMessage('error', 'Invalid Json')
				return;
			}

			json = JSON.parse(code);
			if(!json.dependencies) {
				showMessage('error', 'Invalid package-lock.json code');
				return;
			}
			var mainPackages = json.dependencies;
			let required = {};
      let devrequired = {};
			let subPackages = {};
      let devsubPackages = {};

			showMessage("loading");

			for(const [key, value] of Object.entries(mainPackages)) {
				if(!value.requires) {
          if (!value.dev){
					required[key] = value.version;
          } else {
            devrequired[key] = value.version;
          }
				} else {
          if (!value.dev){
					required[key] = value.version;
					let requires = value.requires;
					for(const [key, value] of Object.entries(requires)) {
						subPackages[key] = value;
					}
          }else {
					devrequired[key] = value.version;
					let requires = value.requires;
					for(const [key, value] of Object.entries(requires)) {
						devsubPackages[key] = value;
					}
          }
				}
			}

			processPackages(required, devrequired, subPackages, devsubPackages, editor);

		});

		async function processPackages(packages, devpackages, subPackages, devsubPackages, editor) {
			let required = packages;
      let devrequired = devpackages;

			for(pkg in packages) {
				console.log("On pkg: "+pkg);
				//skip if exists in subpackages OTHERWISE FETCH AND PUSH TO subPackages
			
				if(subPackages.hasOwnProperty(pkg)) {
					delete required[pkg];
					continue;
				}

				let pkgInfo = await unpack(pkg);
				let dependencies = pkgInfo.collected.metadata.dependencies;

				if(!dependencies) {
					continue;
				}

				for (const [key, value] of Object.entries(dependencies)) {

					if(required.hasOwnProperty(key)) {
						delete required[key];
					}

					subPackages[key] = value;

				}
			}
      for(pkg in devpackages) {
				console.log("On dev pkg: "+pkg);
				//skip if exists in subpackages OTHERWISE FETCH AND PUSH TO subPackages
			
				if(devsubPackages.hasOwnProperty(pkg)) {
					delete devrequired[pkg];
					continue;
				}

				let pkgInfo = await devunpack(pkg);
				let dependencies = pkgInfo.collected.metadata.dependencies;

				if(!dependencies) {
					continue;
				}

				for (const [key, value] of Object.entries(dependencies)) {

					if(devrequired.hasOwnProperty(key)) {
						delete devrequired[key];
					}

					devsubPackages[key] = value;

				}
			}

			let packaged = await packageJson(required, devrequired);
			editor.setValue(packaged);
			showMessage("success", "Successfully Converted: Copy this code and paste it in package.json");

		}

		const packageJson = (processed, devprocessed) => {
			let main = {
				"name": json.name || "converted",
				"version": json.version || "1.0.0",
				"description": "",
				"author": "",
				"license": "ISC",
				"dependencies": processed,
        "devDependencies": devprocessed
			};

			return JSON.stringify(main, null, 4);
		}

		async function unpack(package) {
			const pkgInfo = await getPackage(package)
			return pkgInfo;
		}
  async function devunpack(package) {
			const pkgInfo = await devgetPackage(package)
			return pkgInfo;
		}

		async function getPackage(package) {
			let pkg = encodeURIComponent(package);
		    const response = await fetch("https://api.npms.io/v2/package/"+pkg);
		    const json = await response.json();
		    return json;
		}
  async function devgetPackage(package) {
			let pkg = encodeURIComponent(package);
		    const response = await fetch("https://api.npms.io/v2/package/"+pkg);
		    const json = await response.json();
		    return json;
		}

		function IsValidJSONString(str) {

			if(str === null || str == '' || !isNaN(str) ) {
				return false;
			}

		    try {
		        JSON.parse(str);
		    } catch (e) {
		        return false;
		    }
		    return true;
		}

		function showMessage(type, message = "") {

			if(type == 'loading') {
				$(".block-title").html(` 
					<div class="message ${type}">
						<div class="ball-pulse"><div></div><div></div><div></div></div>
					</div>
				`);
			} else {
				$(".block-title").html(` 
					<div class="message ${type}">
						${message}
					</div>
				`);
			}
		}
});
