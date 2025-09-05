cask "aws-sso-manager" do
  version "2.0.0"
  sha256 "b2975a9a906dc9fe0218f87afc05bb4b346a3a376000dbf1c0e054a797154f39"

  url "https://github.com/cfir-sensi/aws-sso-manager/releases/download/v#{version}/AWS%20SSO%20Manager-#{version}-arm64.dmg",
      verified: "github.com/cfir-sensi/aws-sso-manager/"
  name "AWS SSO Manager"
  desc "Desktop application that simplifies AWS Single Sign-On session management and role switching"
  homepage "https://github.com/cfir-sensi/aws-sso-manager"

  app "AWS SSO Manager.app"

  zap trash: [
    "~/Library/Application Support/aws-sso-manager",
    "~/Library/Preferences/com.aws-sso-manager.plist",
    "~/Library/Logs/aws-sso-manager",
    "~/Library/Saved Application State/com.aws-sso-manager.savedState",
  ]

  livecheck do
    url :url
    strategy :github_latest
  end
end
