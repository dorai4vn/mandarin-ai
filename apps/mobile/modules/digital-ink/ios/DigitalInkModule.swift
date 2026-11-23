import ExpoModulesCore
import MLKitDigitalInkRecognition

struct InkPointRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var t: Double = 0
}

struct InkStrokeRecord: Record {
  @Field var points: [InkPointRecord] = []
}

struct WritingAreaRecord: Record {
  @Field var width: Double = 0
  @Field var height: Double = 0
}

enum DigitalInkError: Error, CustomStringConvertible {
  case unsupportedLanguage(String)
  case modelNotDownloaded(String)
  case recognitionFailed(String)

  var description: String {
    switch self {
    case .unsupportedLanguage(let tag): return "Unsupported Digital Ink language tag: \(tag)"
    case .modelNotDownloaded(let tag): return "Digital Ink model not downloaded: \(tag)"
    case .recognitionFailed(let message): return "Recognition failed: \(message)"
    }
  }
}

/// Thin bridge over Google ML Kit Digital Ink. Input is vector strokes (x, y, t), not images.
public class DigitalInkModule: Module {
  // Keep a strong reference: ML Kit requires the recognizer to outlive the async call.
  private var recognizers: [String: DigitalInkRecognizer] = [:]
  private var observers: [NSObjectProtocol] = []

  private func model(for tag: String) throws -> DigitalInkRecognitionModel {
    guard let identifier = DigitalInkRecognitionModelIdentifier(forLanguageTag: tag) else {
      throw DigitalInkError.unsupportedLanguage(tag)
    }
    return DigitalInkRecognitionModel(modelIdentifier: identifier)
  }

  public func definition() -> ModuleDefinition {
    Name("DigitalInk")

    AsyncFunction("isModelDownloaded") { (languageTag: String) throws -> Bool in
      let model = try self.model(for: languageTag)
      return ModelManager.modelManager().isModelDownloaded(model)
    }

    AsyncFunction("downloadModel") { (languageTag: String, promise: Promise) in
      do {
        let model = try self.model(for: languageTag)
        let manager = ModelManager.modelManager()
        if manager.isModelDownloaded(model) {
          promise.resolve(true)
          return
        }
        var succeeded: NSObjectProtocol?
        var failed: NSObjectProtocol?
        let cleanup = { [weak self] in
          if let s = succeeded { NotificationCenter.default.removeObserver(s) }
          if let f = failed { NotificationCenter.default.removeObserver(f) }
          self?.observers.removeAll { $0 === succeeded || $0 === failed }
        }
        succeeded = NotificationCenter.default.addObserver(
          forName: .mlkitModelDownloadDidSucceed, object: nil, queue: .main
        ) { _ in
          cleanup()
          promise.resolve(true)
        }
        failed = NotificationCenter.default.addObserver(
          forName: .mlkitModelDownloadDidFail, object: nil, queue: .main
        ) { notification in
          cleanup()
          let err = notification.userInfo?[ModelDownloadUserInfoKey.error.rawValue] as? NSError
          promise.reject("ERR_MODEL_DOWNLOAD", err?.localizedDescription ?? "Model download failed")
        }
        self.observers.append(contentsOf: [succeeded!, failed!])
        let conditions = ModelDownloadConditions(allowsCellularAccess: true, allowsBackgroundDownloading: true)
        _ = manager.download(model, conditions: conditions)
      } catch {
        promise.reject("ERR_MODEL", String(describing: error))
      }
    }

    AsyncFunction("recognize") { (languageTag: String, strokes: [InkStrokeRecord], writingArea: WritingAreaRecord?, promise: Promise) in
      do {
        let model = try self.model(for: languageTag)
        guard ModelManager.modelManager().isModelDownloaded(model) else {
          throw DigitalInkError.modelNotDownloaded(languageTag)
        }
        let recognizer = self.recognizers[languageTag]
          ?? DigitalInkRecognizer.digitalInkRecognizer(options: DigitalInkRecognizerOptions(model: model))
        self.recognizers[languageTag] = recognizer

        let ink = Ink(strokes: strokes.map { stroke in
          Stroke(points: stroke.points.map { p in
            StrokePoint(x: Float(p.x), y: Float(p.y), t: Int(p.t))
          })
        })
        let completion: (DigitalInkRecognitionResult?, Error?) -> Void = { result, error in
          if let error = error {
            promise.reject("ERR_RECOGNIZE", DigitalInkError.recognitionFailed(error.localizedDescription).description)
            return
          }
          let candidates = (result?.candidates ?? []).map { c -> [String: Any] in
            var item: [String: Any] = ["text": c.text]
            if let score = c.score {
              item["score"] = score.doubleValue
            } else {
              item["score"] = NSNull()
            }
            return item
          }
          promise.resolve(["candidates": candidates, "modelId": languageTag])
        }
        if let area = writingArea, area.width > 0, area.height > 0 {
          let context = DigitalInkRecognitionContext(
            preContext: "",
            writingArea: WritingArea(width: Float(area.width), height: Float(area.height))
          )
          recognizer.recognize(ink: ink, context: context, completion: completion)
        } else {
          recognizer.recognize(ink: ink, completion: completion)
        }
      } catch {
        promise.reject("ERR_RECOGNIZE", String(describing: error))
      }
    }

    OnDestroy {
      self.observers.forEach { NotificationCenter.default.removeObserver($0) }
      self.observers.removeAll()
      self.recognizers.removeAll()
    }
  }
}
