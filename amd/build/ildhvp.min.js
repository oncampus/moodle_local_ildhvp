define(['jquery', 'core/ajax'], function ($, ajax) {
    /** @namespace */
    var ILD = ILD || {};

    /**
     * Interactions counter
     * @type {Array}
     */
    ILD.interactions = [];

    /**
     * SingelChoiceInteractions counter
     * @type {Array}
     */
    ILD.singleChoiceInteractions = [];

    /**
     * subContentIds - avoid duplicated answered statement
     * @type {Array}
     */
    ILD.subIds = [];

    /**
     * Stores QuestionSet PassPercentage
     * @type {Array}
     */
    ILD.questionSetPassPercentage = [];

    /**
     * Stores Essay PassPercentage
     * @type {Array}
     */
    ILD.EssayPassPercentage = [];

    /**
     * Stores Branching scenario info
     * @type {Array}
     */
    ILD.BranchingScenario = [];

    /**
     * Stores maxScore of interactions
     * @type {Int}
     */
    ILD.maxScore = 0;

    /**
     * Stores score of interactions
     * @type {Float}
     */
    ILD.score = 0;

    /**
     * Stores percentage of interactions progress
     * @type {Float}
     */
    ILD.percentage = 0;

    /**
     * Handlers for counting the number of scored H5P tasks.
     * @type {object}
     */
    ILD.analyzeHandlers = {};

    /**
     * Handlers for adding alternative for triggering scorebar.
     * @type {object}
     */
    ILD.completedHandlers = {};

    /**
     * Analyze H5P content: Blanks.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.blanks = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: BranchingScenario.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.branchingScenario = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: CoursePresentation.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.coursePresentation = function(params) {
      if (!params || !params.presentation || !params.presentation.slides) {
        return; // Seems to be a problem with Course Presentation
      }

      const results = [];
      let subContentIds = [];

      params.presentation.slides.forEach(function(slide) {
        slide.elements = slide.elements || [];

        slide.elements.forEach(function(element) {
          if (!element.action || !element.action.library || !element.action.subContentId || !element.action.params) {
            return; // Content element broken, skip
          }

          const handlerName = ILD.getHandlerName(element.action.library);

          let childResult;
          if (!ILD.analyzeHandlers[handlerName]) {
            childResult = ILD.sanitizeAnalyzeHandlerResult(); // Default result
          }
          else {
            childResult = ILD.sanitizeAnalyzeHandlerResult(ILD.analyzeHandlers[handlerName](element.action.params));
          }

          if (childResult.isScored) {
            if (childResult.subContentIds.length === 0) {
              // Simple subcontent task, so we need its subContentId
              subContentIds.push(element.action.subContentId);
            }
            else {
              // Simple subcontent has subcontent itself, need ids from subcontent
              subContentIds = subContentIds.concat(childResult.subContentIds);
            }
          }

          results.push(childResult);
        });
      });

      // Detect whether task is scored itself
      const isScored = results.some(function (result) {
        return result.isScored;
      });

      subContentIds.concat(results.reduce(function (merge, result) {
        return merge.concat(result.subContentIds);
      }, []));

      return {
        isScored: isScored,
        subContentIds: subContentIds
      };
    };

    /**
     * Analyze H5P content: DragQuestion.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.dragQuestion = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: DragText.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.dragText = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: Essay.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.essay = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: FlashCards.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.flashCards = function() {
      return {
        customXAPITriggerScored: 'completed',
        isScored: true
      };
    };

    /**
     * Analyze H5P content: GuessTheAnswer.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.guessTheAnswer = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: imageHotspotQuestion.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.imageHotspotQuestion = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: InteractiveVideo.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.interactiveVideo = function(params) {
      if (!params || !params.interactiveVideo) {
        return; // Seems to be a problem with Interactive Video
      }

      const results = [];
      let subContentIds = [];

      // Regular interactions
      if (params.interactiveVideo.assets && params.interactiveVideo.assets.interactions) {
        params.interactiveVideo.assets.interactions.forEach(function(interaction) {
          if (!interaction.action || !interaction.action.library ||
              !interaction.action.subContentId || !interaction.action.params) {
            return; // Content element broken, skip
          }

          const handlerName = ILD.getHandlerName(interaction.action.library);

          let childResult;

          // Get result from child content (or default result if no handler)
          if (!ILD.analyzeHandlers[handlerName]) {
            childResult = ILD.sanitizeAnalyzeHandlerResult(); // Default result
          }
          else {
            childResult = ILD.sanitizeAnalyzeHandlerResult(ILD.analyzeHandlers[handlerName](interaction.action.params));
          }

          if (childResult.isScored) {
            if (childResult.subContentIds.length === 0) {
              // Simple subcontent task, so we need its subContentId
              subContentIds.push(interaction.action.subContentId);
            }
            else {
              // Simple subcontent has subcontent itself, need ids from subcontent
              subContentIds = subContentIds.concat(childResult.subContentIds);
            }
          }

          results.push(childResult);
        });
      }

      // Interactive Video has a summary task outside regular interactions
      if (params.interactiveVideo.summary && params.interactiveVideo.summary.task && params.interactiveVideo.summary.task.params) {
        const childResult =
          ILD.sanitizeAnalyzeHandlerResult(ILD.analyzeHandlers['summary'](params.interactiveVideo.summary.task.params));

        // Get subContentIds from extra summary task
        childResult.subContentIds.forEach(function(id) {
          subContentIds.push(id);
        });

        results.push(childResult);
      }

      // Detect whether task is scored itself
      const isScored = results.some(function (result) {
        return result.isScored;
      });

      subContentIds.concat(results.reduce(function (merge, result) {
        return merge.concat(result.subContentIds);
      }, []));

      return {
        isScored: isScored,
        subContentIds: subContentIds
      };
    };

    /**
     * Analyze H5P content: MarkTheWords.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.markTheWords = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: MemoryGame.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.memoryGame = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: MultiChoice.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.multiChoice = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: Questionnaire.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.questionnaire = function() {
      return {
        isScored: true
      };
    };

    /**
     * Analyze H5P content: SingleChoiceSet.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.singleChoiceSet = function(params) {
      if (!params || !params.choices || params.choices.length === 0) {
        return {
          isScored: false,
          subContentIds: []
        };
      }

      const subContentIds = params.choices
        .filter(function (choice) {
          // Take care of users adding incomplete options
          return choice.question && choice.answers;
        })
        .map(function(choice) {
          return choice.subContentId;
        })
        .filter(function(id) {
          return typeof id !== 'undefined';
        });

      return {
        isScored: true,
        subContentIds: subContentIds
      };
    };

    /**
     * Analyze H5P content: Summary.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.summary = function(params) {
      if (!params || !params.summaries || params.summaries.length === 0) {
        return {
          isScored: false,
          subContentIds: []
        };
      }

      const subContentIds = params.summaries
        .filter(function(summaryTask) {
          // Take care of users adding incomplete options
          return summaryTask.summary;
        })
        .map(function(summaryTask) {
          return summaryTask.subContentId;
        })
        .filter(function(id) {
          return typeof id !== 'undefined';
        });

      return {
        isScored: true,
        subContentIds: subContentIds
      };
    };

    /**
     * Analyze H5P content: TrueFalse.
     * @param {object} params Content parameters.
     * @return {object} Analysis results
     */
    ILD.analyzeHandlers.trueFalse = function() {
      return {
        isScored: true
      };
    };

    /**
     * Get a fully initialized and sanitized handler result.
     * @param {object} [result] Result from handler.
     * @param {string} [result.customXAPITriggerScored='answered'] Custom verb for when scoring should be triggered.
     * @param {boolean} [result.isScored=false] True, if H5P content type is scored.
     * @param {string[]} [result.subContentIds=[]] List of subcontentIds to count.
     * @return {object} Sanitized result.
     */
    ILD.sanitizeAnalyzeHandlerResult = function (result) {
      if (typeof result !== 'object' || Array.isArray(result)) {
        result = {};
      }

      if (typeof result.customXAPITriggerScored !== 'string') {
        result.customXAPITriggerScored = 'answered';
      }

      if (typeof result.isScored !== 'boolean') {
        result.isScored = false;
      }

      if (!Array.isArray(result.subContentIds)) {
        result.subContentIds = [];
      }

      return result;
    };

    /**
     * Custom handler for triggering scorebar: CoursePresentation.
     * @param {object} params Content type parameters.
     * @param {number} contentId H5P content Id.
     */
    ILD.completedHandlers.coursePresentation = function(params, contentId) {
      if (!params || !params.presentation || !Array.isArray(params.presentation.slides)) {
        return;
      }

      // Get number of last slide
      const lastSlideNumber = params.presentation.slides.length;

      // Only one slide (or broken), so is completed
      if (lastSlideNumber < 2) {
        ILD.setResult(contentId, 100, 100);
        return;
      }

      // Trigger completed if last slide is reached
      const handleXAPIcall = function (event) {
        if (event.getVerb() === 'progressed') {

          const currentSlide = event.data.statement.object.definition.extensions['http://id.tincanapi.com/extension/ending-point'];

          if (currentSlide === lastSlideNumber) {
            ILD.setResult(contentId, 100, 100);
            H5P.externalDispatcher.off('xAPI', handleXAPIcall);
          }
        }
      };

      H5P.externalDispatcher.on('xAPI', handleXAPIcall);
    };

    /**
     * Get H5P context for contentId.
     * This script unfortunately was not injected using H5P hooks, so we need to sneak inside the iframe.
     * @param {number} contentId ContentId of the H5P content in iframe.
     * @return {object|undefined} H5P context.
     */
    ILD.getH5PContext = function (contentId) {
      const iframeH5P = document.querySelector('#h5p-iframe-' + contentId);
      if (!iframeH5P) {
        return;
      }

      let contentWindowH5P = {};
      try {
        contentWindowH5P = iframeH5P.contentWindow;
      }
      catch (error) {
        // Can't access the iframe content
        return;
      }

      return contentWindowH5P.H5P;
    };

    /**
     * Internal H5P function listening for xAPI answered events and stores scores.
     *
     * @param {H5P.XAPIEvent} event
     */
    ILD.xAPIAnsweredListener = function (event) {
        var contentId = event.getVerifiedStatementValue([
            'object',
            'definition',
            'extensions',
            'http://h5p.org/x-api/h5p-local-content-id']
        );
        var isInteraction = false;

        if (event.data.statement.object.objectType == 'Activity') {
            isInteraction = true;
        }

        if (isInteraction &&
            event.getVerb() === 'answered' &&
            typeof ILD.questionSetPassPercentage[contentId] === 'undefined' &&
            typeof ILD.singleChoiceInteractions[contentId] === 'undefined' &&
            typeof ILD.EssayPassPercentage[contentId] === 'undefined' &&
            typeof ILD.BranchingScenario[contentId] === 'undefined'
        ) {

            var score = event.getScore();
            var maxScore = event.getMaxScore();
            var subContentId = event.data.statement.object.id;
            subContentId = subContentId.split('subContentId=');
            subContentId = subContentId[1];

            if (ILD.subIds.indexOf(subContentId) != -1) {
                if (typeof ILD.interactions[contentId] === 'undefined') {
                    ILD.interactions[contentId] = 1;
                }

                // ILD.score += score;
                // ILD.maxScore += maxScore;
                var interactions = ILD.interactions[contentId];

                ILD.percentage = ILD.percentage + ((score / maxScore) / interactions) * 100;
                ILD.setResult(contentId, ILD.percentage, 100);
            } else if (ILD.subIds.indexOf(subContentId) == -1 && ILD.subIds.length == 0) {
                var percentage = (score / maxScore) * 100;

                ILD.setResult(contentId, percentage, 100);
            }
        }

        // TODO: Add custom hooks/handlers for content types instead of this percentage stuff

        // Check if QuestionSet is completed and percentage is set.
        if (typeof ILD.questionSetPassPercentage[contentId] !== 'undefined' && event.getVerb() === 'completed') {
            var score = event.getScore();
            var maxScore = event.getMaxScore();
            var percentage = (score / maxScore) * 100;
            var passPercentage = ILD.questionSetPassPercentage[contentId];

            if (percentage >= passPercentage) {
                ILD.setResult(contentId, 100, 100);
            }
        }

        // Check if Essay is scored.
        if (typeof ILD.EssayPassPercentage[contentId] !== 'undefined' && event.getVerb() === 'answered') {
            var score = event.getScore();
            var maxScore = event.getMaxScore();
            var percentage = (score / maxScore) * 100;

            ILD.setResult(contentId, percentage, 100);
        }

        // Check if SingelChoiceSet is completed.
        if (typeof ILD.singleChoiceInteractions[contentId] !== 'undefined' && event.getVerb() === 'completed') {
            var score = event.getScore();
            var maxScore = event.getMaxScore();
            var percentage = (score / maxScore) * 100;

            console.log('sc', score, maxScore);

            ILD.setResult(contentId, percentage, 100);
        }

        // Check if BranchingScenario is completed.
        if (typeof ILD.BranchingScenario[contentId] !== 'undefined' && event.getVerb() === 'completed') {
            ILD.setResult(contentId, 100, 100);
        }
    };

    /**
     * Post answered results for user and set progress.
     *
     * @param {number} contentId
     *   Identifies the content
     * @param {number} score
     *   Achieved score/points
     * @param {number} maxScore
     *   The maximum score/points that can be achieved
     */
    ILD.setResult = function (contentid, score, maxScore) {
        var promises = ajax.call([
            {methodname: 'local_ildhvp_setgrade', args: {contentid: contentid, score: score, maxscore: maxScore}}
        ]);

        promises[0].done(function (data) {
            var div_id = String('oc-progress-' + data.sectionid);
            var text_div_id = String('oc-progress-text-' + data.sectionid);
            var percentage = Math.round(data.percentage);
            percentage = String(percentage + '%');

            $('#' + div_id, window.parent.document).css('width', percentage);
            $('#' + text_div_id, window.parent.document).html(percentage);
        }).fail(function (result) {
          console.warn('local_ildhvp_setgrade:', result);
        });
    };

    /**
     * Count interactions layers from interactive video element.
     *
     * @param contentId
     * @param content
     */
    ILD.getVideoInteractions = function (contentId, content) {
        var interactions = content.interactiveVideo.assets.interactions;
        var summaries = content.interactiveVideo.summary.task.params.summaries;
        var notAllowedInteractions = [
            'H5P.Text',
            'H5P.Table',
            'H5P.Link',
            'H5P.Image',
            'H5P.GoToQuestion',
            'H5P.Nil',
            'H5P.IVHotspot'
        ];
        var interactionsCounter = 0;

        if (typeof interactions === 'object') {
            $.each(interactions, function (i) {
                var library = interactions[i].action.library;
                var subid = interactions[i].action.subContentId;
                var foundItem = false;

                $.each(notAllowedInteractions, function (j) {
                    if (library.indexOf(notAllowedInteractions[j]) > -1) {
                        foundItem = true;
                    }
                });

                if (!foundItem) {
                    interactionsCounter++;
                    ILD.subIds.push(subid);
                }
            });

            ILD.interactions[contentId] = interactionsCounter;
        }

        if (typeof interactions === 'undefined' || (typeof interactions === 'object' && interactionsCounter == 0)) {
            $('.h5p-iframe')[0].contentWindow.onload = function () {
                $('.h5p-iframe')[0].contentWindow.H5P.instances[0].video.on('stateChange', function (event) {
                    if (event.data === 0) {
                        ILD.setResult(contentId, 100, 100);
                    }
                });
            };
        }

        if (summaries.length) {
            var summary = false;

            $.each(summaries, function(s) {
               if(typeof (summaries[s].summary) !== 'undefined') {
                   var subId = content.interactiveVideo.summary.task.subContentId;

                   ILD.subIds.push(subId);
                   summary = true;
               }
            });

            if(summary) {
                ILD.interactions[contentId] = interactionsCounter + 1;
            }
        }
    };

    /**
     * Count interactions layers from SingleChoice element.
     *
     * @param contentId
     * @param content
     */
    ILD.getSingleChoiceInteractions = function (contentId, content) {
        var interactions = content.choices;

        $.each(interactions, function (s) {
            var subid = interactions[s].subContentId;
            ILD.subIds.push(subid);
        });

        ILD.singleChoiceInteractions[contentId] = interactions.length;
    };

    /**
     *
     * @param contentId
     * @param content
     */
    ILD.getQuestionSetPercentage = function (contentId, content) {
        ILD.questionSetPassPercentage[contentId] = content.passPercentage;
    };

    /**
     *
     * @param contentId
     * @param content
     */
    ILD.getEssayPercentage = function (contentId, content) {
        ILD.EssayPassPercentage[contentId] = content.behaviour.percentagePassing;
    };

    /**
     * Get H5P machine name from library name.
     * @param {string} libraryName Library name.
     * @return {string} H5P machine name.
     */
    ILD.getMachineName = function (libraryName) {
      return libraryName.split(' ')[0];
    };

    /**
     * Get handler name from library name.
     * @param {string} libraryName Library name (or machine name).
     * @return {string} Handler name.
     */
    ILD.getHandlerName = function (libraryName) {
      const machineName = ILD.getMachineName(libraryName);

      return machineName.split('.')[1].charAt(0).toLowerCase() +
        machineName.split('.')[1].slice(1);
    };

    /**
     * Check if library is InteractiveVideo or QuestionSet.
     */
    ILD.checkLibrary = function () {
        var contentId = $('.h5p-iframe.h5p-initialized').data('content-id');

        if (typeof contentId !== 'undefined') {
            var contentData = H5PIntegration.contents['cid-' + contentId];
            var content = JSON.parse(contentData.jsonContent); // Needs try/catch
            var library = contentData.library; // H5P.FooBar x.y

            const machineName = ILD.getMachineName(library); // H5P.FooBar
            const handlerName = ILD.getHandlerName(library); // fooBar

            if (library.indexOf('H5P.InteractiveVideo') > -1) {
                ILD.getVideoInteractions(contentId, content);
            } else if (library.indexOf('H5P.QuestionSet') > -1) {
                ILD.getQuestionSetPercentage(contentId, content);
            } else if (library.indexOf('H5P.SingleChoiceSet') > -1) {
                ILD.getSingleChoiceInteractions(contentId, content);
            } else if (library.indexOf('H5P.Essay') > -1) {
                ILD.getEssayPercentage(contentId, content);
            } else if (library.indexOf('H5P.BranchingScenario') > -1) {
                ILD.BranchingScenario[contentId] = 1;
            } else if (machineName === 'H5P.CoursePresentation') {

                // This will be the handler without hardcoding ...
                if (ILD.analyzeHandlers[handlerName]) {
                  const result = ILD.analyzeHandlers[handlerName](content);
                  ILD.interactions[contentId] = result.subContentIds.length;
                  ILD.subIds = result.subContentIds;

                  // Some content types need a custom handler for detecting completion
                  if (!result.isScored && ILD.completedHandlers[handlerName]) {
                    ILD.completedHandlers[handlerName](content, contentId);
                  }
                  else {
                    // Regular xAPI listener
                  }
                }
            }
        }
    };

    return {
        init: function () {
            ILD.checkLibrary();
            // TODO: Launch this conditionally, so only if needed
            H5P.externalDispatcher.on('xAPI', ILD.xAPIAnsweredListener);
        }
    };
});
