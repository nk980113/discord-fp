import { Event } from "../types.js";
import { Interaction } from "discord.js";
import { CommandParams } from "./index.js";

export type MiddlewareFn<
    Params extends CommandParams,
    $Context = Params["_ctx"]
> = {
    (opts: {
        event: Interaction;
        ctx: Params["_ctx"];
        next: {
            (): Promise<MiddlewareResult<Interaction, Params["_ctx"]> | void>;
            <$Context>(
                e: Event<Interaction, $Context>
            ): Promise<MiddlewareResult<Interaction, $Context> | void>;
        };
    }): Promise<MiddlewareResult<Interaction, $Context> | void> | void;
};

export type MiddlewareResult<Event extends Interaction, Context> = {
    event: Event;
    ctx: Context;
};

export async function executeWithMiddleware<E extends Interaction>(
    event: E,
    middlewares: MiddlewareFn<any, any>[],
    callback: (e: Event<E, any>) => void | Promise<void>
) {
    const callRecursive = async (
        index: number,
        last: MiddlewareResult<E, any>
    ): Promise<MiddlewareResult<Interaction, any> | void> => {
        const fn = middlewares[index];
        if (fn == null) return last;

        const result = await fn({
            event: last.event,
            ctx: last.ctx,
            next<$Context>(opts?: Event<Interaction, $Context>) {
                const nextOpts =
                    opts == null
                        ? last
                        : {
                              event: opts.event as E,
                              ctx: opts.ctx,
                          };

                return callRecursive(index + 1, nextOpts);
            },
        });

        if (result != null) return result;
    };

    const params = await callRecursive(0, {
        event,
        ctx: {},
    });

    if (params != null) {
        return await callback({
            event: params.event as E,
            ctx: params.ctx,
        });
    }
}