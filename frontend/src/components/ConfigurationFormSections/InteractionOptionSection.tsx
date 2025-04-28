import React from 'react';
import { InteractionOptions } from '../../Types';
import "styles.css"
interface Props {
    options: InteractionOptions | undefined;
    isListPage: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // Handler from parent
}

const defaultInteractionOptions: InteractionOptions = {
    interactionStrategy: 'none',
    maxScrolls: 20,
    scrollDelayMs: 500,
    scrollStagnationTimeoutMs: 3000,
    loadMoreButtonSelector: undefined,
    maxClicks: 5,
    clickDelayMs: 1500,
    maxItemsToScrape: undefined,
};

const InteractionOptionsSection: React.FC<Props> = ({ options, isListPage, onChange }) => {

    const currentOptions = {
        ...defaultInteractionOptions,
        ...(options ?? {})
    };

    const currentStrategy = currentOptions.interactionStrategy ?? 'none';

    const showInfiniteScrollOptions = isListPage && currentStrategy === 'infiniteScroll';
    const showLoadMoreButtonOptions = isListPage && currentStrategy === 'loadMoreButton';
    const showFixedScrollsOptions = isListPage && currentStrategy === 'fixedScrolls';
    const showMaxItemsInput = isListPage && currentStrategy !== 'none';

    return (
        <div className="form-section">
            <h3>Page Interaction Options {isListPage ? '' : '(List Pages Only)'}</h3>
            <small style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                {isListPage
                    ? 'Choose how to load dynamic content (e.g., infinite scroll, "load more" buttons).'
                    : 'These options only apply when Page Type is set to ListPage.'}
            </small>

            {/* Interaction Strategy Dropdown */}
            <div className="form-field" style={{ marginBottom: '15px' }}>
                <label htmlFor="interactionStrategy">Interaction Strategy:</label>
                <select
                    id="interactionStrategy"
                    name="interactionStrategy"
                    value={currentStrategy}
                    onChange={onChange}
                    disabled={!isListPage}
                >
                    <option value="none">None</option>
                    <option value="infiniteScroll">Infinite Scroll (Scroll until bottom)</option>
                    <option value="loadMoreButton">Load More Button (Click repeatedly)</option>
                    <option value="fixedScrolls">Fixed Number of Scrolls</option>
                </select>
            </div>


            {/* Infinite Scroll Options */}
            {showInfiniteScrollOptions && (
                <div className="options-subsection infinite-scroll-options">
                    <h4>Infinite Scroll Options</h4>
                    <div className="form-field">
                        <label htmlFor="maxScrolls">Max Scrolls (Safety Limit):</label>
                        <input type="number" id="maxScrolls" name="maxScrolls" min="1"
                               value={currentOptions.maxScrolls ?? ''}
                               onChange={onChange} />
                        <small>A safety limit to prevent endless scrolling.</small>
                    </div>
                    <div className="form-field">
                        <label htmlFor="scrollDelayMs">Scroll Delay (ms):</label>
                        <input type="number" id="scrollDelayMs" name="scrollDelayMs" min="200"
                               value={currentOptions.scrollDelayMs ?? ''}
                               onChange={onChange} />
                        <small>Delay between each scroll action (e.g., 500).</small>
                    </div>
                    <div className="form-field">
                        <label htmlFor="scrollStagnationTimeoutMs">Scroll Stagnation Timeout (ms):</label>
                        <input type="number" id="scrollStagnationTimeoutMs" name="scrollStagnationTimeoutMs" min="1000"
                               value={currentOptions.scrollStagnationTimeoutMs ?? ''}
                               onChange={onChange} />
                        <small>Time page height must remain stable to stop scrolling (e.g., 3000).</small>
                    </div>
                </div>
            )}

            {/* Load More Button Options */}
            {showLoadMoreButtonOptions && (
                <div className="options-subsection load-more-options">
                    <h4>Load More Button Options</h4>
                    <div className="form-field">
                        <label htmlFor="loadMoreButtonSelector">Button Selector: <span style={{color: 'red'}}>*</span></label>
                        <input style={{ width: '95%' }} type="text" id="loadMoreButtonSelector" name="loadMoreButtonSelector"
                               value={currentOptions.loadMoreButtonSelector ?? ''} // Use ?? '' for controlled input
                               onChange={onChange}
                               placeholder="e.g., button.load-more, [data-testid='load-more']"
                               required={showLoadMoreButtonOptions} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="maxClicks">Max Clicks:</label>
                        <input type="number" id="maxClicks" name="maxClicks" min="0"
                               value={currentOptions.maxClicks ?? ''}
                               onChange={onChange} />
                        <small>Maximum times to click the button (0 for unlimited, until button disappears or item limit reached).</small>
                    </div>
                    <div className="form-field">
                        <label htmlFor="clickDelayMs">Click Delay (ms):</label>
                        <input type="number" id="clickDelayMs" name="clickDelayMs" min="500"
                               value={currentOptions.clickDelayMs ?? ''}
                               onChange={onChange} />
                        <small>Delay after clicking the button (e.g., 1500).</small>
                    </div>
                    {/* Removed buttonScrollAttempts and buttonScrollDelayMs as they now use main scroll settings */}
                    <small style={{display: 'block', marginTop: '10px', fontStyle: 'italic', color: '#555'}}>
                        Note: The scraper will scroll down (using general scroll settings if defined, or defaults) to find the button before each click attempt.
                    </small>
                </div>
            )}

            {/* Fixed Scrolls Options */}
            {showFixedScrollsOptions && (
                <div className="options-subsection fixed-scroll-options">
                    <h4>Fixed Scrolls Options</h4>
                    <div className="form-field">
                        <label htmlFor="maxScrolls">Number of Scrolls:</label>
                        <input type="number" id="maxScrolls" name="maxScrolls" min="1"
                               value={currentOptions.maxScrolls ?? ''} // Reuse maxScrolls field
                               onChange={onChange} />
                        <small>The exact number of times to scroll down.</small>
                    </div>
                    <div className="form-field">
                        <label htmlFor="scrollDelayMs">Scroll Delay (ms):</label>
                        <input type="number" id="scrollDelayMs" name="scrollDelayMs" min="200"
                               value={currentOptions.scrollDelayMs ?? ''} // Reuse scrollDelayMs field
                               onChange={onChange} />
                        <small>Delay between each scroll action.</small>
                    </div>
                </div>
            )}

            {/* Max Items Limit (Common to active strategies) */}
            {showMaxItemsInput && (
                <div style={{ borderTop: '1px dashed #eee', paddingTop: '15px', marginTop: '15px' }}>
                    <label htmlFor="maxItemsToScrape">Max Items To Scrape (Overall Limit):</label>
                    <input type="number" id="maxItemsToScrape" name="maxItemsToScrape" min="1"
                           value={currentOptions.maxItemsToScrape ?? ''}
                           onChange={onChange}
                           placeholder="e.g., 100 (Leave blank for no limit)" />
                    <small>Stop interactions and scraping after finding this many items matching the 'Item Selector'.</small>
                </div>
            )}
        </div>
    );
};

export default InteractionOptionsSection;