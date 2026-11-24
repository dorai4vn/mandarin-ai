require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'DigitalInk'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'Mandarin AI'
  s.homepage       = 'https://github.com/dorai4vn/mandarin-ai'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/dorai4vn/mandarin-ai.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Pinned (D-016). Latest on CocoaPods trunk at M0: GoogleMLKit 9.0.0 / MLKitDigitalInkRecognition 8.0.0.
  s.dependency 'GoogleMLKit/DigitalInkRecognition', '9.0.0'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
