import {getInput, info, setFailed, warning} from '@actions/core';
import {context, getOctokit} from '@actions/github';

async function run() {
    try {
        const minimumApprovals = Number.parseInt(getInput("minimum_approvals"), 10);
        if (Number.isNaN(minimumApprovals) || minimumApprovals < 1) {
            setFailed(`Invalid input count of input.minimum_approvals`);
        }

        const token = getInput("token");
        const kit = getOctokit(token);
        const reviews = await kit.pulls.listReviews({
            ...context.repo,
            pull_number: context.payload.pull_request.number
        })

        const currentUserReviews = new Map<Number, string>();
        reviews.data.forEach((review) => {
            currentUserReviews.set(review.user.id, review.state);
        })
        const userReviewsStates = Array.from(currentUserReviews.values());

        if (userReviewsStates.includes('REQUEST_CHANGES')) {
            setFailed('Please implement the requested changes or dismiss the review');
            return;
        }

        if (userReviewsStates.includes('PENDING')) {
            warning('Warning: There are pending reviews');
        }

        const number_of_approvals = userReviewsStates.filter((status) => status === 'APPROVED').length;
        if (number_of_approvals >= minimumApprovals) {
            info(`This Pull Request has enough approvals to be merged`);
        } else {
            setFailed(`This Pull Request needs at least '${minimumApprovals}' approval(s)`);
        }
        return;
    } catch (e) {
        setFailed(`Exception: ${e}`);
        return
    }
}

run().catch((reason) => {
    setFailed(`Exception: ${reason}`)
})
